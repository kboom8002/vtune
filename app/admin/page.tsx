import { createClient } from '@supabase/supabase-js';
import { ShieldAlert, Database, Calendar } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const secretKey = (await searchParams).secret;
  
  if (secretKey !== 'vibe2026') {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-white/50">올바른 ?secret 파라미터가 필요합니다.</p>
      </div>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch data
  const { data: sessions, error: sessionErr } = await supabase
    .from('rewrite_sessions')
    .select('session_id, created_at, input_channel, tone_card_id, picked_variant_id, usefulness_1to5')
    .order('created_at', { ascending: false });

  if (sessionErr) throw sessionErr;

  const totalSessions = sessions?.length || 0;
  const pickedSessions = sessions?.filter(s => s.picked_variant_id).length || 0;
  
  // Calculate average rating
  const ratedSessions = sessions?.filter(s => s.usefulness_1to5 > 0) || [];
  const avgMood = ratedSessions.reduce((acc, s) => acc + s.usefulness_1to5, 0) / (ratedSessions.length || 1);

  return (
    <div className="min-h-screen p-8 text-white">
      <header className="mb-10 border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" /> Vibe OS Living Lab Admin
          </h1>
          <p className="text-white/50 mt-2">수집된 사용자톤 변환 세션 데이터 개요</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white/50 mb-1">총 생성 세션 수</h3>
          <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{totalSessions}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white/50 mb-1">복사/선택 전환율</h3>
          <p className="text-4xl font-bold">{totalSessions ? Math.round((pickedSessions / totalSessions) * 100) : 0}%</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white/50 mb-1">평균 기분 향상 지표 (5점 만점)</h3>
          <p className="text-4xl font-bold text-yellow-400">{avgMood.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">총 {ratedSessions.length}명 응답</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5"/> 최근 세션 기록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50 uppercase bg-black/20">
              <tr>
                <th className="px-6 py-4">생성 일시</th>
                <th className="px-6 py-4">목표 장르어</th>
                <th className="px-6 py-4">채널</th>
                <th className="px-6 py-4 text-center">선택된 Variant</th>
                <th className="px-6 py-4 text-center">기분 척도 (1~5)</th>
              </tr>
            </thead>
            <tbody>
              {sessions?.map((s) => (
                <tr key={s.session_id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-white/70">
                    {new Date(s.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </td>
                  <td className="px-6 py-4 font-mono text-primary/80">{s.tone_card_id}</td>
                  <td className="px-6 py-4 uppercase text-xs tracking-wider">{s.input_channel}</td>
                  <td className="px-6 py-4 text-center">
                    {s.picked_variant_id ? (
                      <span className="bg-primary/20 text-primary-glow px-2 py-1 rounded font-bold uppercase">{s.picked_variant_id}</span>
                    ) : (
                      <span className="text-white/20">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-yellow-500 font-bold">
                    {s.usefulness_1to5 || '-'}
                  </td>
                </tr>
              ))}
              {sessions?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
