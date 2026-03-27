export interface VibeVector {
  affect: {
    warmth: number;
    energy: number;
    empathy: number;
    professionalism: number;
  };
  semantic: {
    clarity: number;
    assertiveness: number;
    hedging: number;
    structure: number;
  };
}

export interface ToneCard {
  card_id: string;
  display_name: string;
  qpe_mu: VibeVector;
  qpe_sigma: VibeVector;
}

export interface TaskContract {
  lang: string;
  channel: string;
  length_pref: string;
  target_role: string;
  goal: string;
  tone_card_id: string;
  raw_text: string;
  context_note: string;
  pii_masked: boolean;
  signals: string[];
  constraints?: {
    must_include?: string[];
    must_avoid?: string[];
  };
}

export interface VectorSampleResult {
  v1: VibeVector;
  v2: VibeVector;
  v3: VibeVector;
}

export interface RewriteVariant {
  variant_id: 'v1' | 'v2' | 'v3';
  text: string;
  one_line_rationale: string;
  self_check: {
    axes_alignment: VibeVector;
  };
}

export interface ValidationResultObj {
  variant_id: 'v1' | 'v2' | 'v3';
  status: 'PASS' | 'FIX' | 'BLOCK';
  flags: string[];
  minimal_fix?: { apply: boolean; fixed_text?: string };
}

export interface N4ValidationOutput {
  validation: {
    results: ValidationResultObj[];
    overall: {
      recommended_variant_id: string;
      notes_for_user: string;
    };
  }
}
