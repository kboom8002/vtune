"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, CheckCircle, ShieldAlert, Copy, Star, RefreshCcw } from "lucide-react";

export default function VibeOSMain() {
  const [cards, setCards] = useState<any[]>([]);
  const [rawText, setRawText] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [channel, setChannel] = useState("kakao");
  
  const [status, setStatus] = useState<"intake" | "loading" | "results">("intake");
  const [sessionId, setSessionId] = useState<string>("");
  const [variants, setVariants] = useState<any[]>([]);
  
  // UX State
  const [pickedVariant, setPickedVariant] = useState<string>("");
  const [ratingVal, setRatingVal] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedId, setCopiedId] = useState("");

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
    setPickedVariant("");
    setIsSubmitted(false);
    setRatingVal(0);
    
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

  const handleCopyAndSelect = (vid: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(vid);
      setTimeout(() => setCopiedId(""), 2000);
    }
    setPickedVariant(vid);
  };

  const handleSubmitRating = async () => {
    if (!pickedVariant || ratingVal === 0) return;
    setIsSubmitted(true);
    
    try {
      await fetch('/api/pick', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          picked_variant_id: pickedVariant, 
          ratings: { tone_match: ratingVal, usefulness: ratingVal } 
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = () => {
    setRawText("");
    setStatus("intake");
    setPickedVariant("");
    setIsSubmitted(false);
    setRatingVal(0);
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
            </div>
            
            <div className="flex flex-col gap-4">
              {variants.map((v) => (
                <div key={v.variant_id} className={`glass-card p-5 ${pickedVariant === v.variant_id ? 'ring-2 ring-primary bg-primary/10' : ''} ${isSubmitted && pickedVariant !== v.variant_id ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white/80 uppercase tracking-widest">
                      {v.variant_id === 'v1' ? '기준형 (μ)' : v.variant_id === 'v2' ? '안전형 (Rel)' : '명료형 (Clarity)'}
                    </span>
                    <div className="flex gap-2 items-center">
                      {v.axes_delta_l2 > 0.20 && <ShieldAlert className="w-5 h-5 text-red-400" />}
                      <button onClick={() => handleCopyAndSelect(v.variant_id, v.text)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 transition-colors" title="복사하기">
                        {copiedId === v.variant_id ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{v.text}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                    <p className="text-[11px] text-white/50"><strong>근거:</strong> {v.one_line_rationale || ''}</p>
                    <p className="text-[10px] text-white/30 font-mono tracking-tighter mix-blend-screen opacity-50">L2: {v.axes_delta_l2?.toFixed(3)}</p>
                  </div>

                  {!pickedVariant && (
                   <button onClick={() => handleCopyAndSelect(v.variant_id, v.text)} className="mt-4 w-full bg-primary/20 hover:bg-primary/40 text-primary-glow font-bold transition-colors py-3 rounded-xl text-sm flex justify-center items-center gap-2">
                     <Copy className="w-4 h-4"/> 이 버전 복사 및 연구 참여 (선택)
                   </button>
                  )}

                  {pickedVariant === v.variant_id && !isSubmitted && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-4 border-t border-white/10 overflow-hidden text-center">
                      <p className="text-sm font-semibold mb-1 text-white/90">복사되었습니다!</p>
                      <p className="text-xs text-white/60 font-medium mb-4">문장을 확인해 보셨다면, 발송 후 기분이 얼마나 향상될 것 같은지 알려주세요.</p>
                      <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                           <button key={s} onClick={() => setRatingVal(s)} className={`p-3 rounded-full transition-all ${ratingVal >= s ? 'bg-yellow-400/20 text-yellow-500 scale-110' : 'bg-white/5 text-white/20'}`}>
                             <Star className="w-6 h-6 fill-current" />
                           </button>
                        ))}
                      </div>
                      <button disabled={ratingVal === 0} onClick={handleSubmitRating} className="w-full bg-primary/90 hover:bg-primary py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2">
                        평가 제출하기
                      </button>
                    </motion.div>
                  )}

                  {pickedVariant === v.variant_id && isSubmitted && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center">
                       <p className="text-green-400 font-bold flex justify-center gap-2 items-center mb-4"><CheckCircle className="w-5 h-5"/> 평가 및 기록 완료</p>
                       <button onClick={handleRestart} className="glass-button w-full flex justify-center items-center gap-2">
                         <RefreshCcw className="w-4 h-4"/> 새로운 문장 교정하기
                       </button>
                    </motion.div>
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
