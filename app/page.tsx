"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, Send, CheckCircle, ShieldAlert } from "lucide-react";

export default function VibeOSMain() {
  const [cards, setCards] = useState<any[]>([]);
  const [rawText, setRawText] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [channel, setChannel] = useState("kakao");
  
  const [status, setStatus] = useState<"intake" | "loading" | "results">("intake");
  const [sessionId, setSessionId] = useState<string>("");
  const [variants, setVariants] = useState<any[]>([]);
  const [pickedVariant, setPickedVariant] = useState<string>("");
  const [ratings, setRatings] = useState({ tone_match: 5, usefulness: 5 });

  useEffect(() => {
    fetch('/api/tone-cards')
      .then(r => r.json())
      .then(d => { if (d.length) { setCards(d); setSelectedCard(d[0].term_key); } })
      .catch(console.error);
  }, []);

  const handleRewrite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || !selectedCard) return;
    setStatus("loading");
    
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, tone_card_id: selectedCard, channel: channel, goal: "" })
      });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.session_id);
        setVariants(data.variants);
        setStatus("results");
      } else {
        alert("Error: " + data.error);
        setStatus("intake");
      }
    } catch {
      setStatus("intake");
    }
  };

  const handlePick = async (vid: string) => {
    try {
      await fetch('/api/pick', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, picked_variant_id: vid, ratings })
      });
      setPickedVariant(vid);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <header className="mb-8 select-none">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent inline-flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary/80" /> Vibe OS
        </h1>
        <p className="text-white/50 text-sm mt-1">Tone Rewriter Lab | V1 (QPE-Driven)</p>
      </header>

      <AnimatePresence mode="wait">
        {status === "intake" && (
          <motion.form 
            key="intake" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-6" onSubmit={handleRewrite}
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">어떤 상황의 텍스트인가요?</label>
              <select className="glass-input h-14" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="kakao">카카오톡 (편안하게)</option>
                <option value="slack">슬랙/협업툴 (사무적으로)</option>
                <option value="email">이메일 (격식있게)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">원문 (초안)</label>
              <textarea 
                className="glass-input min-h-[140px] resize-none" 
                placeholder="마음속에 있는 말을 그대로 적어주세요..."
                value={rawText} onChange={(e) => setRawText(e.target.value)} required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">목표 톤 변환 카드 (장르어)</label>
              <div className="grid grid-cols-1 overflow-y-auto max-h-[300px] gap-2 p-1">
                {cards.map(c => (
                  <label key={c.term_key} className={`glass-card p-4 cursor-pointer flex gap-4 items-center ${selectedCard === c.term_key ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-white/[0.05]'}`}>
                    <input type="radio" className="hidden" name="toneCard" value={c.term_key} checked={selectedCard === c.term_key} onChange={(e) => setSelectedCard(e.target.value)} />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedCard === c.term_key ? 'border-primary' : 'border-white/30'}`}>
                      {selectedCard === c.term_key && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                    </div>
                    <span className="font-medium text-white/90">{c.display_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="glass-button w-full mt-4 flex justify-center items-center gap-2">
              <MessageCircle className="w-5 h-5" /> 톤 교정 변환하기
            </button>
          </motion.form>
        )}

        {status === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-8">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-r-2 border-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-white/80 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-bold">오케스트레이터 분석 중...</p>
              <p className="text-sm text-white/50 animate-pulse">[N1] ~ [N4] 노드 처리 및 벡터 연산 중</p>
            </div>
          </motion.div>
        )}

        {status === "results" && (
          <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">생성된 대안 (3가지)</h2>
              <button className="text-sm text-primary underline" onClick={() => { setStatus('intake'); setPickedVariant(''); }}>다시 시도</button>
            </div>
            
            <div className="flex flex-col gap-4">
              {variants.map((v, i) => (
                <div key={v.variant_id} className={`glass-card p-5 ${pickedVariant === v.variant_id ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white/80 uppercase tracking-widest">{v.variant_id === 'v1' ? '기준형 (μ)' : v.variant_id === 'v2' ? '안전형 (Rel)' : '명료형 (Clarity)'}</span>
                    {v.axes_delta_l2 > 0.20 && <ShieldAlert className="w-5 h-5 text-red-400" />}
                  </div>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{v.text}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                    <p className="text-xs text-white/50"><strong>근거:</strong> {v.target_axes ? (v as any).one_line_rationale || '' : ''}</p>
                    <p className="text-[10px] text-white/40 font-mono tracking-tighter mix-blend-screen opacity-50">L2: {v.axes_delta_l2?.toFixed(3)}</p>
                  </div>

                  {!pickedVariant && (
                   <button onClick={() => handlePick(v.variant_id)} className="mt-4 w-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-2">
                     <CheckCircle className="w-4 h-4"/> 이 버전 선택하기 (연구 참여)
                   </button>
                  )}
                  {pickedVariant === v.variant_id && (
                    <div className="mt-4 text-primary text-sm font-bold flex gap-2 justify-center items-center bg-primary/10 py-2 rounded-lg"><CheckCircle className="w-4 h-4"/> 선택 완료 됨</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
