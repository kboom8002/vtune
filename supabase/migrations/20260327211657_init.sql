-- 1. 장르어(Tone Card) 사전 테이블
CREATE TABLE IF NOT EXISTS tone_term (
    term_key          TEXT PRIMARY KEY,
    display_name      TEXT NOT NULL,
    definition        TEXT NOT NULL,
    qpe_mu            JSONB NOT NULL DEFAULT '{}'::jsonb,
    qpe_sigma         JSONB NOT NULL DEFAULT '{}'::jsonb,
    anchors_good      JSONB DEFAULT '[]'::jsonb,
    anchors_bad       JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 세션 테이블
CREATE TABLE IF NOT EXISTS rewrite_sessions (
    session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash      TEXT,
    input_channel     TEXT NOT NULL,
    goal              TEXT,
    audience          TEXT,
    raw_text_hash     TEXT,
    tone_card_id      TEXT REFERENCES tone_term(term_key),
    condition         TEXT,
    picked_variant_id TEXT,
    tone_match_1to5   SMALLINT,
    usefulness_1to5   SMALLINT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 생성된 3버전(Variants) 상세 테이블
CREATE TABLE IF NOT EXISTS rewrite_variants (
    variant_id        TEXT NOT NULL,
    session_id        UUID REFERENCES rewrite_sessions(session_id),
    target_axes_json  JSONB NOT NULL,
    output_text       TEXT NOT NULL,
    axes_estimate_json JSONB NOT NULL,
    axes_delta_l2     DOUBLE PRECISION NOT NULL,
    mixed_signal_flags_json JSONB DEFAULT '[]'::jsonb,
    PRIMARY KEY (session_id, variant_id)
);

-- 4. 리서치 및 액션 로그 테이블
CREATE TABLE IF NOT EXISTS events (
    event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID REFERENCES rewrite_sessions(session_id),
    event_name        TEXT NOT NULL,
    ts                TIMESTAMPTZ NOT NULL DEFAULT now()
);
