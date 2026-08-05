'use client';
import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { useAITutor } from '@/features/ai-tutor/hooks';

interface Msg { role: 'kai' | 'me'; text: string; }

export default function AiTutorPage() {
  const ai = useAITutor();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'kai', text: 'Hi! I\'m Kai 🦉 What are we learning today?' }]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollTo?.({ top: 1e9 }); }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: 'me', text }]);
    setInput('');
    ai.mutate(text, {
      onSuccess: (r) => { setMsgs((m) => [...m, { role: 'kai', text: r.answer }]); setSuggestions(r.suggestions ?? []); },
      onError: () => setMsgs((m) => [...m, { role: 'kai', text: 'Oops — I could not reach the server. Is the API running?' }]),
    });
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl border-2 border-brand-100 shadow-card overflow-hidden flex flex-col h-[70vh]">
          <div className="flex items-center gap-3 p-4 border-b-2 border-brand-100">
            <div className="text-3xl">🦉</div>
            <div><div className="font-display font-extrabold text-brand-900">Kai · AI Tutor</div><div className="font-body font-bold text-grass-600 text-xs">● Online · POST /ai/chat</div></div>
          </div>
          <div ref={endRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[80%] px-4 py-2.5 font-body font-bold text-sm ${m.role === 'me' ? 'ml-auto bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl rounded-br-sm' : 'bg-brand-100 text-brand-900 rounded-2xl rounded-bl-sm'}`}>{m.text}</div>
            ))}
            {ai.isPending && <div className="bg-brand-100 text-brand-500 rounded-2xl px-4 py-2.5 w-16 font-bold">…</div>}
          </div>
          {suggestions.length > 0 && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap">
              {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="text-xs font-display font-extrabold bg-brand-100 text-brand-700 rounded-full px-3 py-1.5">{s}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-4 border-t-2 border-brand-100 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Kai anything…" className="flex-1 bg-brand-50 rounded-2xl px-4 py-3 font-body font-bold text-brand-900 outline-none" />
            <Button type="submit" disabled={ai.isPending}>Send</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
