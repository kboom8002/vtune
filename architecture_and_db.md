## 1. 프로젝트 개요 (System Overview)
[cite_start]본 프로젝트는 사용자가 원문을 입력하고 목표 톤카드(장르어)를 선택하면, 시스템이 해당 톤카드의 QPE(Quantified Prompt Engineering) 목표 벡터($\mu$)와 허용 표준편차($\sigma$) 내에서 3개의 리라이팅 버전을 생성하는 "2분 컷 Tone Rewriter MVP"이자 "리빙랩(Living Lab)" 웹 애플리케이션이다. [cite: 576, 580, 778, 810]

**핵심 철학:**
* [cite_start]결과는 단순한 텍스트 리포트가 아니라, 분석 및 제어에 즉시 재사용 가능한 `VibeVector` 표준 객체로 저장되어야 한다. [cite: 588, 621, 1801, 1802]
* [cite_start]사용자의 '버전 선택(Pick)' 이벤트는 선호도 조사가 아닌, 톤 모사 정확도(Human Fidelity)를 측정하는 라벨 데이터로 취급되어 톤카드 벡터 매핑 업데이트에 사용된다. [cite: 611, 773, 774, 997, 998]

## 2. 기술 스택 (Tech Stack)
* [cite_start]**Frontend / Backend Framework:** Next.js (App Router, 모바일 퍼스트 UI) [cite: 752]
* [cite_start]**Database / Auth:** Supabase (PostgreSQL, Row Level Security 적용) [cite: 775, 1913]
* **LLM API:** Google Gemini 3.0 (Structured Outputs 강제 적용 필수)
* [cite_start]**AI Orchestration:** Google Antigravity 기반 Agent Toolkit 패턴 (Node Graph 체인) [cite: 654, 879]

## 3. 핵심 디렉토리 구조 (Directory Structure)
[cite_start]에이전트는 아래의 계층적 디렉토리 구조를 준수하여 코드를 스캐폴딩(Scaffolding)해야 한다. [cite: 751]

```text
/
├── app/                  # Next.js App Router (UI & API Routes)
│   ├── api/
[cite_start]│   │   ├── session/      # 세션 시작/종료 관리 [cite: 667, 682]
[cite_start]│   │   ├── tone-cards/   # 톤카드 목록 및 $\mu$, $\sigma$ 조회 [cite: 671, 967]
[cite_start]│   │   ├── rewrite/      # 3버전 생성 (N1~N4 Agent 체인 실행) 
[cite_start]│   │   ├── pick/         # 사용자 선택 및 평정 저장 
[cite_start]│   │   └── event/        # 복사/공유 등 리서치 로깅 [cite: 680, 970]
[cite_start]│   ├── (routes)/         # /, /compose, /tone, /results 등 프론트엔드 뷰 [cite: 659, 660, 662, 663]
[cite_start]├── contracts/            # 시스템 전체에서 공유되는 불변 JSON Schema 정의 [cite: 722, 755]
[cite_start]│   ├── VibeVector.schema.json [cite: 723]
[cite_start]│   └── RewriteResponse.schema.json [cite: 724]
├── services/
[cite_start]│   ├── agents/           # N0~N6 오케스트레이션 및 툴 노드 로직 [cite: 754]
│   └── supabase/         # DB 클라이언트 및 쿼리 헬퍼
[cite_start]└── evals/                # 자동 회귀 테스트 및 Golden Runs 저장소 [cite: 739, 756]
4. 코어 데이터베이스 스키마 (Foundry Core DB DDL)Supabase(PostgreSQL)에 구축할 초기 DDL이다. 리빙랩 연구 데이터셋(Dual Helix) 구조를 강제한다.  에이전트는 DB 마이그레이션 파일 작성 시 아래 스키마를 100% 반영해야 한다.SQL-- 1. 장르어(Tone Card) 사전 테이블: $\mu$와 $\sigma$를 저장하는 기준점 [cite: 694, 696, 1925, 1928, 1930]
CREATE TABLE IF NOT EXISTS tone_term (
    term_key          TEXT PRIMARY KEY,
    display_name      TEXT NOT NULL,
    definition        TEXT NOT NULL,
    qpe_mu            JSONB NOT NULL DEFAULT '{}'::jsonb, -- 목표 평균 벡터 [cite: 841]
    qpe_sigma         JSONB NOT NULL DEFAULT '{}'::jsonb, -- 허용 표준편차 [cite: 842]
    anchors_good      JSONB DEFAULT '[]'::jsonb,
    anchors_bad       JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 세션 테이블 (개인정보 최소화 및 맥락 저장) [cite: 684, 685, 972]
CREATE TABLE IF NOT EXISTS rewrite_sessions (
    session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash      TEXT, -- PII 배제, 익명 해시 [cite: 821, 974]
    input_channel     TEXT NOT NULL, -- 카톡, 슬랙 등 [cite: 827, 976]
    goal              TEXT,
    audience          TEXT,
    raw_text_hash     TEXT, -- 보안을 위해 원문 해시만 저장 권장 [cite: 1740]
    tone_card_id      TEXT REFERENCES tone_term(term_key), [cite: 978]
    condition         TEXT, -- 예: qpe_3var_sigma075 [cite: 980]
    picked_variant_id TEXT, -- 최종 선택된 버전 (A/B/C) [cite: 981]
    tone_match_1to5   SMALLINT, -- 주관 평정 [cite: 982]
    usefulness_1to5   SMALLINT, -- 주관 평정 [cite: 982]
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now() [cite: 975]
);

-- 3. 생성된 3버전(Variants) 상세 테이블 [cite: 690, 983]
CREATE TABLE IF NOT EXISTS rewrite_variants (
    variant_id        TEXT NOT NULL, -- A, B, C 등 [cite: 985]
    session_id        UUID REFERENCES rewrite_sessions(session_id), [cite: 984]
    target_axes_json  JSONB NOT NULL, -- N2에서 샘플링된 목표 벡터 [cite: 986]
    output_text       TEXT NOT NULL, [cite: 692]
    axes_estimate_json JSONB NOT NULL, -- N4에서 자가 측정된 추정 벡터 [cite: 853, 988]
    axes_delta_l2     DOUBLE PRECISION NOT NULL, -- 목표와 추정 간의 거리 (L2 Norm) [cite: 854, 989]
    mixed_signal_flags_json JSONB DEFAULT '[]'::jsonb, [cite: 990]
    PRIMARY KEY (session_id, variant_id)
);

-- 4. 리서치 및 액션 로그 테이블 [cite: 992]
CREATE TABLE IF NOT EXISTS events (
    event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID REFERENCES rewrite_sessions(session_id), [cite: 993]
    event_name        TEXT NOT NULL, -- copy_clicked, download 등 [cite: 994]
    ts                TIMESTAMPTZ NOT NULL DEFAULT now() [cite: 995]
);
5. 핵심 API 엔드포인트 계약 (API Endpoints Contract)에이전트는 아래의 입출력 스펙을 기반으로 app/api/ 하위 라우트를 구현해야 한다. POST /api/rewrite 역할: 사용자 원문과 목표 톤카드를 받아 3개의 버전을 생성 (Node N1~N4 체인 실행).Request: { session_id, raw_text, channel, goal, tone_card_id } Response: { variants: [ { variant_id, text, target_axes, axes_estimate, axes_delta_l2 } ] } POST /api/pick 역할: 사용자가 선택한 버전과 2문항 평정 결과를 DB에 적재 (Node N6 Archivist). Request: { session_id, picked_variant_id, ratings: { tone_match, usefulness } } Response: { success: true }6. 에이전트 개발 가이드라인 (Guardrails for AI Developer)Fail-Fast 원칙: LLM 응답이 contracts/에 정의된 JSON Schema와 일치하지 않거나 additionalProperties: false 규칙을 위반할 경우, 즉시 파싱을 중단하고 재시도 로직을 태울 것. 데이터 무결성: rewrite_variants 저장 시 수학적 연산(axes_delta_l2)은 LLM의 출력을 맹신하지 말고 백엔드 로직에서 직접 한 번 더 재계산 후 적재할 것.