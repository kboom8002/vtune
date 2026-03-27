import { createClient } from '@supabase/supabase-js';
import { FinalVariant } from './N4_Validate';

export async function initSession(payload: any, toneCardId: string, inputChannel: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await supabase.from('rewrite_sessions').insert({
    input_channel: inputChannel,
    goal: payload.goal,
    audience: payload.target_role,
    tone_card_id: toneCardId,
    // raw_text_hash to protect PII
    raw_text_hash: 'stripped_hash_placeholder'
  }).select('session_id').single();

  if (error) throw error;
  return data.session_id;
}

export async function archiveVariants(sessionId: string, variants: FinalVariant[]) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const inserts = variants.map(v => ({
    session_id: sessionId,
    variant_id: v.variant_id,
    target_axes_json: v.target_axes,
    output_text: v.text,  // [cite: 692]
    axes_estimate_json: v.axes_estimate,
    axes_delta_l2: v.axes_delta_l2,
    mixed_signal_flags_json: v.mixed_signal_flags
  }));

  const { error } = await supabase.from('rewrite_variants').insert(inserts);
  if (error) throw error;
}

export async function recordPick(sessionId: string, pickedId: string, ratings: any) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { error } = await supabase.from('rewrite_sessions').update({
    picked_variant_id: pickedId,
    tone_match_1to5: ratings.tone_match,
    usefulness_1to5: ratings.usefulness
  }).eq('session_id', sessionId);

  if (error) throw error;
}
