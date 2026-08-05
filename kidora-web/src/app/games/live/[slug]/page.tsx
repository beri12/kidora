'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLiveGame } from '@/hooks/useLiveGame';
import { Button } from '@/components/ui/button';

// Live multiplayer game room over socket.io. Players join a room, ready up,
// then answer prompts in real time; scores sync live via the NestJS gateway.
export default function LiveGamePage({ params }: { params: { slug: string } }) {
  useRequireAuth();
  const [room] = useState('room-1');
  const { connected, state, ready, answer } = useLiveGame(params.slug, room);

  return (
    <div className="min-h-screen bg-brand-50 p-6">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-extrabold text-3xl text-brand-900 capitalize">{params.slug.replace('-', ' ')}</h1>
          <span className={'font-body-x text-sm px-3 py-1 rounded-full ' + (connected ? 'bg-grass-100 text-grass-600' : 'bg-rose-100 text-rose-600')}>
            {connected ? '● Live' : '○ Connecting…'}
          </span>
        </div>

        {/* players */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {state.players.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border-2 border-brand-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-display font-extrabold" style={{ background: p.avatarColor }}>{p.name[0]}</div>
              <span className="font-display font-extrabold text-brand-900 flex-1">{p.name}</span>
              <span className="font-display font-extrabold text-sun-500">{p.score}</span>
            </div>
          ))}
          {state.players.length === 0 && <div className="font-body font-bold text-brand-500">Waiting for players…</div>}
        </div>

        {state.status === 'lobby' && <Button onClick={ready}>I&apos;m ready ✋</Button>}
        {state.status === 'playing' && (
          <div className="bg-white rounded-3xl border-2 border-brand-100 p-8 text-center shadow-card">
            <div className="font-body-x text-sm text-brand-400">Round {state.round}</div>
            <div className="font-display font-extrabold text-3xl text-brand-900 my-4">{state.prompt}</div>
            <div className="flex gap-3 justify-center flex-wrap">
              {[1, 2, 3, 4].map((n) => <Button key={n} variant="outline" onClick={() => answer(n)}>Option {n}</Button>)}
            </div>
          </div>
        )}
        {state.status === 'over' && <div className="font-display font-extrabold text-2xl text-brand-900">Game over! 🎉</div>}
      </div>
    </div>
  );
}
