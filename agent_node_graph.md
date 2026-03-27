## 1. 워크플로우 개요 (Agent Workflow DAG)
[cite_start]이 시스템은 단일 LLM 호출이 아닌, 7개의 노드(Node)로 구성된 방향성 비순환 그래프(DAG) 형태의 오케스트레이션 파이프라인으로 동작한다 [cite: 882-883, 1438-1440]. [cite_start]AI 에이전트(개발자)는 이 흐름을 LangChain, xState, 또는 커스텀 상태 머신 패턴을 사용하여 백엔드(Next.js API Route 또는 별도 Agent Service)에 구현해야 한다 [cite: 654-656].

**실행 순서:**
[cite_start]`[N0] Intake` $\rightarrow$ `[N1] ParseInput` $\rightarrow$ `[N2] VectorSample` $\rightarrow$ `[N3] Rewrite3` $\rightarrow$ `[N4] Validate/MS-Guard` $\rightarrow$ (실패 시 N3로 루프 백) $\rightarrow$ `[N5] Present&Rate` $\rightarrow$ `[N6] Archivist` [cite: 882-883, 1438-1440]

---

## 2. 노드별 상세 명세 및 I/O 컨트랙트 (Node Specifications)

[cite_start]모든 LLM 노드(N1, N3, N4)는 `schema_strict: true` 원칙을 따르며, Gemini 3.0의 `responseSchema` 파라미터를 사용하여 JSON 출력을 100% 강제해야 한다 [cite: 1446-1447, 1460-1461].

### [cite_start][N1] ParseInput (입력 정규화 및 과업 계약) [cite: 1457-1467]
* **목적:** 사용자의 비정형 입력을 "리라이트 과업 계약(TaskContract)"으로 정규화한다. [cite_start]PII(개인정보)는 이 단계에서 반드시 마스킹한다 [cite: 1463-1466].
* **실행 주체:** LLM (Gemini 3.0)
* [cite_start]**Input:** 사용자 원문(`raw_text`), 채널(`channel`), 목표(`goal`), 대상(`audience`) [cite: 826-830]
* **Output (JSON):** ```json
  {
    "task_contract": {
      "channel": "kakao|slack|email",
      "target_role": "boss|peer|client",
      "tone_card_id": "TC01",
      "pii_masked": true,
      "signals": ["요약된 신호 1", "신호 2"]
    }
  }
[N2] VectorSample (목표 벡터 결정론적 샘플링) 목적: 선택된 톤카드(tone_card_id)의 기준 벡터($\mu$)와 표준편차($\sigma$)를 DB에서 불러와, 생성 타겟이 될 3개의 QPE 벡터를 수학적으로 계산한다 .실행 주체: Backend Logic (Non-LLM. 수학적 결정론) 제약: 모든 축(Warmth, Competence 등)은 0.0 ~ 1.0 사이로 클램프(Clamp) 처리하며, 기준점 $\mu$와의 L1 거리 오차가 최대 0.20을 넘지 않게 제한한다 .Output: v1(기준형), v2(관계 안전형, Warmth 강화), v3(결정/경계형, Clarity 강화)에 대한 각각의 수치 타겟 데이터 .[N3] Rewrite3 (3버전 리라이트 생성) 목적: N1의 task_contract와 N2의 3개 target_vectors를 입력받아, 정확히 3개의 다른 텍스트 버전을 생성한다 . 장황한 추론 과정을 숨기고 각 버전당 "1줄 근거"만 남긴다 .실행 주체: LLM (Gemini 3.0)Input: task_contract 객체, v1, v2, v3의 목표 벡터(Axes) Output (JSON):JSON{
  "variants": [
    { "variant_id": "v1", "text": "생성 문장...", "one_line_rationale": "근거..." },
    { "variant_id": "v2", "text": "...", "one_line_rationale": "..." },
    { "variant_id": "v3", "text": "...", "one_line_rationale": "..." }
  ]
}
[N4] Validate / MS-Guard (검증 및 혼합 신호 필터링) 목적: N3에서 생성된 3개의 문장이 혼합 신호(Mixed Signal: 존중하면서 비꼼 등)나 위험 신호를 포함하는지 검증하고, 목표 벡터와 일치하는지 자체 측정(axes_estimate)한다 .실행 주체: LLM + Rule-based (L2 Norm 거리 계산식 포함) 판정 상태: PASS(통과), FIX(1~2문장 수정 가능), BLOCK(유해함. 재작성 필요) .에러 핸들링 루프: 만약 status가 BLOCK이거나 axes_delta_l2(목표와의 수치 오차)가 임계치를 넘으면, 해당 피드백을 프롬프트에 담아 **[N3]로 되돌려 재작성(Max Retry: 2회)**시킨다 .[N5] Present & Rate (프론트엔드 UI 페이로드) 목적: 검증을 통과한 데이터를 Next.js 클라이언트가 즉시 렌더링할 수 있는 UI 카드 포맷과 리서치 평정용 스키마로 패키징한다 .Output: ui_payload.choices 배열 (3개 문장) 및 사용자가 입력해야 할 rating_schema (tone_match, usefulness 등) .[N6] Archivist (리서치 로그 적재) 목적: ARCHITECTURE_AND_DB.md의 스키마에 따라 단일 트랜잭션(run_id 단위)으로 Supabase에 데이터를 삽입한다 .주요 로직: PII(개인 식별 정보)가 포함된 raw_text는 저장하지 않거나 해시 처리만 하며, N2의 $\mu, \sigma$ 값과 N4의 추정 벡터, 그리고 사용자가 선택한 결과(picked_variant_id)를 완벽히 연결(Join)하여 저장한다 .3. 에이전트 개발 시 필수 준수 사항 (Strict Developer Guidelines)상태 분리: 각 노드는 독립적인 함수(Function/Method)로 작성되어야 한다. 하나의 거대한 프롬프트로 N1~N4를 한 번에 처리하려 하지 말 것.벡터 연산 오프로딩: LLM은 계산에 취약하다. distance_l2 = sqrt((w-w_p)^2 + (c-c_p)^2 + (a-a_p)^2)와 같은 벡터 거리 연산 및 clip(0, 1) 로직은 반드시 Python이나 Node.js/TypeScript 백엔드 코드 단에서 수학 라이브러리를 사용하여 처리해야 한다 .스키마 깨짐 방지: 모든 Gemini 3.0 호출에는 additionalProperties: false가 선언된 JSON Schema 객체를 응답 형식으로 주입하여 JSON Parsing Error 발생 확률을 0%로 통제할 것 .