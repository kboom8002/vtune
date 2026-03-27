# LLM_PROMPT_CONTRACTS.md: Gemini 3.0 프롬프트 및 JSON 스키마 명세

## 1. 개요 및 준수 사항 (Overview & Strict Rules)
이 문서는 워크플로우 내 LLM 노드(N1, N3, N4)가 Gemini 3.0 API를 호출할 때 사용해야 하는 System/User 프롬프트 템플릿과 응답 JSON Schema를 정의한다.
AI 에이전트(개발자)는 코드 구현 시 다음을 반드시 준수해야 한다:
* [cite_start]Gemini API의 `responseSchema` 속성에 아래 정의된 `[OUTPUT_SCHEMA]`를 정확히 매핑할 것 [cite: 1446-1447, 1460-1461].
* [cite_start]System 프롬프트에는 불필요한 추론(Chain of Thought)을 노출하지 않도록 지시가 포함되어야 한다[cite: 1449].

---

## 2. 노드별 프롬프트 및 스키마 계약 (Node Contracts)

### [cite_start][N1] ParseInput (입력 정규화 및 과업 계약) [cite: 1457]

**System Prompt:**
```text
[CONTRACT]
output_format: JSON
schema_strict: true

[TASK]
사용자 입력을 "리라이트 과업 계약(TaskContract)"으로 정규화하라.
- 채널(카톡/슬랙/메일/자기대화)과 길이, 대상, 목적을 확정한다.
- PII(전화/주소/주민번호/계좌/실명 등)가 있으면 마스킹 토큰으로 대체한다.
- 원문에서 '요구/경계/감사/사과/정보전달' 신호를 최소 단위로 요약한다(1~3개).


User Prompt Template:

Plaintext
사용자 입력:
- lang: {{LANG}}
- channel: {{CHANNEL}}
- length_pref: {{LENGTH_PREF}}
- target_role: {{TARGET_ROLE}}
- goal: {{GOAL}}
- tone_card_id: {{TONE_CARD_ID}}
- context_note: {{CONTEXT_NOTE}}
- raw_text: {{RAW_TEXT}}

위 입력을 OUTPUT_SCHEMA에 맞춰 정규화해라.


[OUTPUT_SCHEMA] (JSON Schema):

JSON
{
  "type": "object",
  "properties": {
    "task_contract": {
      "type": "object",
      "properties": {
        "lang": { "type": "string" },
        "channel": { "type": "string", "enum": ["kakao", "slack", "email", "selftalk", "dm"] },
        "length_pref": { "type": "string", "enum": ["short", "mid", "long"] },
        "target_role": { "type": "string", "enum": ["boss", "peer", "client", "partner", "self", "other"] },
        "goal": { "type": "string" },
        "tone_card_id": { "type": "string" },
        "raw_text": { "type": "string" },
        "context_note": { "type": "string" },
        "pii_masked": { "type": "boolean" },
        "signals": { "type": "array", "items": { "type": "string" } },
        "constraints": {
          "type": "object",
          "properties": {
            "must_include": { "type": "array", "items": { "type": "string" } },
            "must_avoid": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "required": ["channel", "target_role", "goal", "raw_text", "pii_masked"]
    }
  },
  "required": ["task_contract"],
  "additionalProperties": false
}


[N3] Rewrite3 (3버전 리라이트 생성) 

System Prompt:

Plaintext
[CONTRACT]
output_format: JSON
schema_strict: true

[GLOBAL_RULES]
- 사용자 의도/사실관계는 유지하고, 톤/명료성/구조만 바꾼다.
- 공격/비꼼/조롱/차별/압박/과장/가스라이팅 금지.
- 길이(length_pref)에 맞춰 문장 수를 제한한다: short(1~2) / mid(3~5) / long(6~10).
- 각 variant마다 "톤 정렬 근거 1줄"을 붙인다(장문 금지).


User Prompt Template:

Plaintext
task_contract:
{{TASK_CONTRACT_JSON}}

tone_vector_bundle (목표 벡터):
{{TONE_VECTOR_BUNDLE_JSON}}

OUTPUT_SCHEMA대로 rewrites 3개를 생성해라.


[OUTPUT_SCHEMA] (JSON Schema):

JSON
{
  "type": "object",
  "properties": {
    "rewrite_bundle": {
      "type": "object",
      "properties": {
        "tone_card_id": { "type": "string" },
        "channel": { "type": "string" },
        "rewrites": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "variant_id": { "type": "string", "enum": ["v1", "v2", "v3"] },
              "text": { "type": "string" },
              "one_line_rationale": { "type": "string" },
              "self_check": {
                "type": "object",
                "properties": {
                  "axes_alignment": { "type": "object" }
                }
              }
            },
            "required": ["variant_id", "text", "one_line_rationale"]
          }
        }
      },
      "required": ["tone_card_id", "rewrites"]
    }
  },
  "required": ["rewrite_bundle"],
  "additionalProperties": false
}


[N4] Validate / Mixed-Signal Guard (혼합신호 및 안전 검증) 

System Prompt:

Plaintext
[CONTRACT]
output_format: JSON
schema_strict: true

[TASK]
각 rewrite에 대해 아래를 점검하라.
1) Mixed Signals: 존중하면서 비꼼? 부탁하면서 명령조? 협업하면서 책임전가?
2) Risk/Safety: 과장/협박/모욕/차별/개인정보 포함 여부
3) 최소수정: "한 문장만 바꾸면" 해결되는 수정안 제시

판정: PASS(통과), FIX(수정 가능), BLOCK(유해/재작성 필요)


User Prompt Template:

Plaintext
task_contract:
{{TASK_CONTRACT_JSON}}

rewrite_bundle:
{{REWRITE_BUNDLE_JSON}}

각 variant를 검증하고 OUTPUT_SCHEMA로 결과를 내라.


[OUTPUT_SCHEMA] (JSON Schema):

JSON
{
  "type": "object",
  "properties": {
    "validation": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "variant_id": { "type": "string", "enum": ["v1", "v2", "v3"] },
              "status": { "type": "string", "enum": ["PASS", "FIX", "BLOCK"] },
              "flags": { "type": "array", "items": { "type": "string" } },
              "minimal_fix": {
                "type": "object",
                "properties": {
                  "apply": { "type": "boolean" },
                  "fixed_text": { "type": "string" }
                }
              }
            },
            "required": ["variant_id", "status", "flags"]
          }
        },
        "overall": {
          "type": "object",
          "properties": {
            "recommended_variant_id": { "type": "string" },
            "notes_for_user": { "type": "string" }
          }
        }
      },
      "required": ["results", "overall"]
    }
  },
  "required": ["validation"],
  "additionalProperties": false
}