import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runRewritePipeline } from '@/services/agents/orchestrator';
import { IntakePayload } from '@/services/agents/nodes/N1_ParseInput';
import { initSession, archiveVariants } from '@/services/agents/nodes/N6_Archivist';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, raw_text, channel, goal, tone_card_id } = body;

    if (!raw_text || !tone_card_id) {
      return NextResponse.json({ error: 'Missing raw_text or tone_card_id' }, { status: 400 });
    }

    // Fetch tone card rules from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase env variables missing' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: toneCard, error: tcError } = await supabase
      .from('tone_term')
      .select('*')
      .eq('term_key', tone_card_id)
      .single();

    if (tcError || !toneCard) {
      return NextResponse.json({ error: 'Invalid tone_card_id' }, { status: 400 });
    }

    const payload = new IntakePayload();
    payload.raw_text = raw_text;
    payload.channel = channel || "kakao";
    payload.goal = goal || "";
    payload.tone_card_id = toneCard.term_key;

    // Orchestrate N1 ~ N4
    const result = await runRewritePipeline(payload, toneCard);
    
    // N6 Archivist setup (Session)
    const newSessionId = session_id || await initSession(payload, tone_card_id, channel || "kakao");
    
    // Archive N4 outputs
    await archiveVariants(newSessionId, result.variants);

    // [N5] Present (return to client)
    const clientPayload = result.variants.map((v: any) => ({
      variant_id: v.variant_id,
      text: v.text,
      target_axes: v.target_axes,
      axes_estimate: v.axes_estimate,
      axes_delta_l2: v.axes_delta_l2
    }));

    return NextResponse.json({ 
      session_id: newSessionId,
      variants: clientPayload 
    });
  } catch (error: any) {
    console.error("Rewrite process failed:", error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
