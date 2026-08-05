'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

const MISSIONS_INIT = [
  { id: 'read', icon: '📚', label: 'Read 10 pages', xp: 40, done: false },
  { id: 'math', icon: '🧮', label: 'Complete Math Quest', xp: 60, done: false },
  { id: 'sci', icon: '🔬', label: 'Science Experiment', xp: 50, done: false },
];
const BADGES = [
  { icon: '📚', name: 'Reading Hero', on: true },
  { icon: '🧮', name: 'Math Master', on: true },
  { icon: '🔥', name: '7-Day Streak', on: true },
  { icon: '🚀', name: 'Explorer', on: false },
  { icon: '🏆', name: 'Champion', on: false },
  { icon: '🎨', name: 'Artist', on: false },
];

export default function KidDashboard() {
  const [missions, setMissions] = useState(MISSIONS_INIT);
  const [xp, setXp] = useState(760);
  const [coins, setCoins] = useState(250);
  const goal = 1000;
  const pct = Math.min(100, Math.round((xp / goal) * 100));

  const complete = (id: string) => {
    setMissions((m) => m.map((x) => x.id === id && !x.done ? { ...x, done: true } : x));
    const mission = missions.find((x) => x.id === id);
    if (mission && !mission.done) {
      setXp((v) => Math.min(goal, v + mission.xp));
      setCoins((v) => v + 20);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#8B5CF6', '#16A34A', '#FACC15'] });
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_75%_-5%,#DCFCE7,#F1ECFF_55%)] font-body text-brand-900">
      {/* top bar */}
      <div className="max-w-[1100px] mx-auto px-5 pt-6 flex items-center gap-3 flex-wrap">
        <Link href="/kid/learn" className="ml-auto px-4 py-2 rounded-2xl bg-white border-2 border-brand-100 font-display font-extrabold text-sm text-brand-700">🗺️ Learn</Link>
        <Link href="/plus" className="px-4 py-2 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 font-display font-extrabold text-sm text-white">⭐ Go Plus</Link>
      </div>

      <div className="max-w-[1100px] mx-auto px-5 py-6 grid lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* hero card */}
        <div className="rounded-[28px] p-7 text-white relative overflow-hidden animate-[fadeup_.6s_both]" style={{ background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)' }}>
          <div className="flex items-center gap-4">
            <div className="text-[86px] leading-none animate-bob">🐵</div>
            <div>
              <div className="font-bold opacity-90">Welcome back,</div>
              <h1 className="font-display text-4xl font-extrabold leading-none">Leo! 👋</h1>
              <div className="inline-block mt-2 bg-white/20 px-3 py-1 rounded-full font-display font-extrabold text-sm">Level 8 Explorer</div>
            </div>
          </div>
          {/* XP bar */}
          <div className="mt-6">
            <div className="flex justify-between font-display font-extrabold text-sm mb-1"><span>⭐ XP</span><span>{xp} / {goal}</span></div>
            <div className="h-4 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700" style={{ width: pct + '%' }} /></div>
          </div>
          <div className="flex gap-3 mt-5">
            {[['🪙', coins, 'Coins'], ['💎', 12, 'Gems'], ['🔥', 7, 'Streak']].map((s) => (
              <div key={s[2] as string} className="flex-1 bg-white/15 rounded-2xl py-3 text-center"><div className="font-display font-extrabold text-xl">{s[0]} {s[1]}</div><div className="text-xs font-bold opacity-90">{s[2]}</div></div>
            ))}
          </div>
        </div>

        {/* pet companion */}
        <div className="rounded-[28px] bg-white border-2 border-brand-100 p-7 text-center shadow-card animate-[fadeup_.6s_.1s_both]">
          <div className="font-display font-extrabold text-brand-400 text-sm uppercase tracking-wide">Your companion</div>
          <div className="text-[92px] animate-bob">🐉</div>
          <h3 className="font-display font-extrabold text-2xl">Sparky</h3>
          <p className="font-bold text-brand-500 text-sm">Level 4 · Baby Dragon</p>
          <Link href="/avatar" className="inline-block mt-4 px-5 py-2.5 rounded-2xl bg-brand-100 text-brand-700 font-display font-extrabold text-sm">🎨 Customize avatar</Link>
        </div>

        {/* missions */}
        <div className="rounded-[28px] bg-white border-2 border-brand-100 p-6 shadow-card animate-[fadeup_.6s_.15s_both]">
          <h2 className="font-display font-extrabold text-2xl mb-3">Today&rsquo;s Missions 🎯</h2>
          <div className="flex flex-col gap-3">
            {missions.map((m) => (
              <div key={m.id} className={'flex items-center gap-3 rounded-2xl border-2 p-3.5 ' + (m.done ? 'bg-grass-50 border-grass-300' : 'bg-brand-50 border-brand-100')}>
                <div className="text-2xl">{m.icon}</div>
                <div className="flex-1"><div className="font-display font-extrabold">{m.label}</div><div className="font-bold text-brand-500 text-sm">+{m.xp} XP · +20 🪙</div></div>
                <button onClick={() => complete(m.id)} disabled={m.done} className={'px-4 py-2 rounded-xl font-display font-extrabold text-sm ' + (m.done ? 'bg-grass-500 text-white' : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white')}>{m.done ? 'Done ✓' : 'Start'}</button>
              </div>
            ))}
          </div>
        </div>

        {/* badges */}
        <div className="rounded-[28px] bg-white border-2 border-brand-100 p-6 shadow-card animate-[fadeup_.6s_.2s_both]">
          <h2 className="font-display font-extrabold text-2xl mb-3">Achievements 🏆</h2>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((b) => (
              <div key={b.name} className={'rounded-2xl p-3 text-center border-2 ' + (b.on ? 'bg-white border-grass-300' : 'bg-brand-100/40 border-brand-100 opacity-60')}>
                <div className="text-3xl">{b.on ? b.icon : '🔒'}</div>
                <div className="font-display font-extrabold text-xs mt-1">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
