// [N1] ParseInput Task Contract Schema
export const N1_SCHEMA = {
  type: "object",
  properties: {
    task_contract: {
      type: "object",
      properties: {
        lang: { type: "string" },
        channel: { type: "string", enum: ["kakao", "slack", "email", "selftalk", "dm"] },
        length_pref: { type: "string", enum: ["short", "mid", "long"] },
        target_role: { type: "string", enum: ["boss", "peer", "client", "partner", "self", "other"] },
        goal: { type: "string" },
        tone_card_id: { type: "string" },
        raw_text: { type: "string" },
        context_note: { type: "string" },
        pii_masked: { type: "boolean" },
        signals: { type: "array", items: { type: "string" } },
        constraints: {
          type: "object",
          properties: {
            must_include: { type: "array", items: { type: "string" } },
            must_avoid: { type: "array", items: { type: "string" } }
          }
        }
      },
      required: ["channel", "target_role", "goal", "raw_text", "pii_masked"]
    }
  },
  required: ["task_contract"],
  additionalProperties: false
};

// [N3] Rewrite3 Schema
export const N3_SCHEMA = {
  type: "object",
  properties: {
    rewrite_bundle: {
      type: "object",
      properties: {
        tone_card_id: { type: "string" },
        channel: { type: "string" },
        rewrites: {
          type: "array",
          items: {
            type: "object",
            properties: {
              variant_id: { type: "string", enum: ["v1", "v2", "v3"] },
              text: { type: "string" },
              one_line_rationale: { type: "string" },
              self_check: {
                type: "object",
                properties: {
                  axes_alignment: { 
                    type: "object",
                    properties: {
                      affect: { 
                        type: "object", 
                        properties: { warmth: {type:"number"}, energy: {type:"number"}, empathy: {type:"number"}, professionalism: {type:"number"} }, 
                        required: ["warmth", "energy", "empathy", "professionalism"] 
                      },
                      semantic: { 
                        type: "object", 
                        properties: { clarity: {type:"number"}, assertiveness: {type:"number"}, hedging: {type:"number"}, structure: {type:"number"} }, 
                        required: ["clarity", "assertiveness", "hedging", "structure"] 
                      }
                    },
                    required: ["affect", "semantic"]
                  }
                },
                required: ["axes_alignment"]
              }
            },
            required: ["variant_id", "text", "one_line_rationale", "self_check"]
          }
        }
      },
      required: ["tone_card_id", "rewrites"]
    }
  },
  required: ["rewrite_bundle"],
  additionalProperties: false
};

// [N4] Validate Schema
export const N4_SCHEMA = {
  type: "object",
  properties: {
    validation: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              variant_id: { type: "string", enum: ["v1", "v2", "v3"] },
              status: { type: "string", enum: ["PASS", "FIX", "BLOCK"] },
              flags: { type: "array", items: { type: "string" } },
              minimal_fix: {
                type: "object",
                properties: {
                  apply: { type: "boolean" },
                  fixed_text: { type: "string" }
                }
              }
            },
            required: ["variant_id", "status", "flags"]
          }
        },
        overall: {
          type: "object",
          properties: {
            recommended_variant_id: { type: "string" },
            notes_for_user: { type: "string" }
          }
        }
      },
      required: ["results", "overall"]
    }
  },
  required: ["validation"],
  additionalProperties: false
};

export const PROMPTS = {
  N1_SYSTEM: `[CONTRACT]
output_format: JSON
schema_strict: true

[TASK]
사용자 입력을 "리라이트 과업 계약(TaskContract)"으로 정규화하라.
- 채널(카톡/슬랙/메일/자기대화)과 길이, 대상, 목적을 확정한다.
- PII(전화/주소/주민번호/계좌/실명 등)가 있으면 마스킹 토큰으로 대체한다.
- 원문에서 '요구/경계/감사/사과/정보전달' 신호를 최소 단위로 요약한다(1~3개).`,

  N1_USER: (lang: string, channel: string, lengthPref: string, targetRole: string, goal: string, toneCardId: string, contextNote: string, rawText: string) => `사용자 입력:
- lang: ${lang}
- channel: ${channel}
- length_pref: ${lengthPref}
- target_role: ${targetRole}
- goal: ${goal}
- tone_card_id: ${toneCardId}
- context_note: ${contextNote}
- raw_text: ${rawText}

위 입력을 OUTPUT_SCHEMA에 맞춰 정규화해라.`,

  N3_SYSTEM: `[CONTRACT]
output_format: JSON
schema_strict: true

[GLOBAL_RULES]
- 사용자 의도/사실관계는 유지하고, 톤/명료성/구조만 바꾼다.
- 공격/비꼼/조롱/차별/압박/과장/가스라이팅 금지.
- 길이에 맞춰 문장 수를 제한한다: short(1~2) / mid(3~5) / long(6~10).
- 각 variant마다 "톤 정렬 근거 1줄"을 붙인다(장문 금지).`,

  N3_USER: (taskContract: string, toneVectorBundle: string) => `task_contract:
${taskContract}

tone_vector_bundle (목표 벡터):
${toneVectorBundle}

OUTPUT_SCHEMA대로 rewrites 3개를 생성해라.`,

  N4_SYSTEM: `[CONTRACT]
output_format: JSON
schema_strict: true

[TASK]
각 rewrite에 대해 아래를 점검하라.
1) Mixed Signals: 존중하면서 비꼼? 부탁하면서 명령조? 협업하면서 책임전가?
2) Risk/Safety: 과장/협박/모욕/차별/개인정보 포함 여부
3) 최소수정: "한 문장만 바꾸면" 해결되는 수정안 제시

판정: PASS(통과), FIX(수정 가능), BLOCK(유해/재작성 필요)`,

  N4_USER: (taskContract: string, rewriteBundle: string) => `task_contract:
${taskContract}

rewrite_bundle:
${rewriteBundle}

각 variant를 검증하고 OUTPUT_SCHEMA로 결과를 내라.`,
};
