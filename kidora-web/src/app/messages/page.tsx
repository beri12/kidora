'use client';
import { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { useChat } from '@/features/chat/useChat';
import { api } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

interface Convo { id: string; type: string; title?: string | null; lastMessage?: { body: string } | null; }
const REACTIONS = ['👍', '❤️', '😂', '🎉', '⭐'];

export default function MessagesPage() {
  const { data: convos } = useQuery({ queryKey: ['conversations'], queryFn: async () => (await api.get<Convo[]>('/chat/conversations')).data });
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { connected, messages, typingUsers, online, me, send, setTyping, react, remove } = useChat(active);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.parentElement?.scrollTo({ top: 1e9 }); }, [messages]);
  useEffect(() => { if (!active && convos?.length) setActive(convos[0].id); }, [convos, active]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(draft); setDraft(''); setTyping(false); };
  const label = (c: Convo) => c.title || (c.type === 'dm' ? 'Direct message' : c.type);

  return (
    <div className="min-h-screen bg-brand-50 font-body text-brand-900">
      <Navbar />
      <div className="max-w-[1120px] mx-auto px-4 py-6 grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-120px)]">
        {/* conversation list */}
        <aside className="bg-white rounded-3xl border-2 border-brand-100 shadow-card p-3 overflow-y-auto">
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="font-display font-extrabold text-xl">Messages 💬</h2>
            <span className={'w-2.5 h-2.5 rounded-full ' + (connected ? 'bg-grass-500' : 'bg-brand-200')} title={connected ? 'Connected' : 'Offline'} />
          </div>
          {(convos ?? []).length === 0 && <div className="p-4 text-center font-bold text-brand-400 text-sm">No conversations yet. Start one from a teacher or class page.</div>}
          <div className="flex flex-col gap-1">
            {(convos ?? []).map((c) => (
              <button key={c.id} onClick={() => setActive(c.id)} className={'text-left rounded-2xl px-3 py-2.5 transition ' + (active === c.id ? 'bg-brand-100' : 'hover:bg-brand-50')}>
                <div className="font-display font-extrabold text-brand-900 text-sm truncate">{label(c)}</div>
                <div className="font-bold text-brand-400 text-xs truncate">{c.lastMessage?.body ?? 'Say hello 👋'}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* thread */}
        <section className="bg-white rounded-3xl border-2 border-brand-100 shadow-card flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-center p-8"><div><div className="text-5xl mb-2">💬</div><div className="font-display font-extrabold text-brand-500">Pick a conversation to start chatting</div></div></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.senderId === me;
                  return (
                    <div key={m.id} className={'group max-w-[75%] ' + (mine ? 'ml-auto' : '')}>
                      <div className={'px-4 py-2.5 font-bold text-sm relative ' + (mine ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl rounded-br-sm' : 'bg-brand-100 text-brand-900 rounded-2xl rounded-bl-sm')}>
                        {m.deletedAt ? <em className="opacity-60">message deleted</em> : m.body}
                        {m.editedAt && !m.deletedAt && <span className="opacity-60 text-[10px] ml-1">(edited)</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                        {REACTIONS.map((e) => <button key={e} onClick={() => react(m.id, e)} className="text-xs hover:scale-125 transition">{e}</button>)}
                        {mine && !m.deletedAt && <button onClick={() => remove(m.id)} className="text-[10px] font-bold text-brand-400 ml-1">delete</button>}
                      </div>
                      {Object.entries(m.reactions ?? {}).filter(([, u]) => u.length).length > 0 && (
                        <div className="flex gap-1 mt-1">{Object.entries(m.reactions).filter(([, u]) => u.length).map(([e, u]) => <span key={e} className="bg-white border border-brand-100 rounded-full px-2 py-0.5 text-xs font-bold">{e} {u.length}</span>)}</div>
                      )}
                    </div>
                  );
                })}
                {typingUsers.length > 0 && <div className="text-brand-400 font-bold text-sm">typing…</div>}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="p-3 border-t-2 border-brand-100 flex gap-2">
                <input value={draft} onChange={(e) => { setDraft(e.target.value); setTyping(!!e.target.value); }} onBlur={() => setTyping(false)} placeholder="Type a message…" className="flex-1 bg-brand-50 rounded-2xl px-4 py-3 font-bold text-brand-900 outline-none" />
                <button type="submit" className="px-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white font-display font-extrabold">Send</button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
