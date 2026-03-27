import { NextResponse } from 'next/server';
import { recordPick } from '@/services/agents/nodes/N6_Archivist';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, picked_variant_id, ratings } = body;

    if (!session_id || !picked_variant_id || !ratings) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await recordPick(session_id, picked_variant_id, ratings);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Pick saving failed:", error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
