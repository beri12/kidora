'use client';
import { useEffect, useRef, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// Simulated real-time feed — swap for a socket.io subscription in production.
const EVENT_POOL = [
  { icon: '🎓', text: 'completed "Addition Adventure"', who: 'Leo', color: '#8B5CF6' },
  { icon: '💳', text: 'upgraded to Family plan', who: 'Priya', color: '#16A34A' },
  { icon: '🏆', text: 'unlocked "Math Master" badge', who: 'Amara', color: '#F59E0B' },
  { icon: '👩‍🏫', text: 'created a new class', who: 'Ms. Okafor', color: '#0284C7' },
  { icon: '🎮', text: 'won Balloon Pop Math', who: 'Marcus', color: '#E11D48' },
  { icon: '🤖', text: 'asked Kai for homework help', who: 'Sofia', color: '#8B5CF6' },
  { icon: '⭐', text: 'started a 7-day streak', who: 'Kenji', color: '#F59E0B' },
];

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(id); }, [ms]);
}

export default function AdminDashboard() {
  useRequireAuth(['ADMIN']);
  useTick(2200); // re-render for live counters

  const [online, setOnline] = useState(9140);
  const [mrr, setMrr] = useState(182000);
  const [lessons, setLessons] = useState(48213);
  const [feed, setFeed] = useState(() => EVENT_POOL.slice(0, 4).map((e, i) => ({ ...e, id: i, t: 'just now' })));
  const [series, setSeries] = useState<number[]>(() => Array.from({ length: 24 }, () => 40 + Math.random() * 60));
  const idRef = useRef(100);

  // Live counters
  useEffect(() => {
    const id = setInterval(() => {
      setOnline((v) => Math.max(8000, v + Math.round((Math.random() - 0.45) * 120)));
      setMrr((v) => v + Math.round(Math.random() * 400));
      setLessons((v) => v + Math.round(Math.random() * 30));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // Live activity feed
  useEffect(() => {
    const id = setInterval(() => {
      const e = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      setFeed((f) => [{ ...e, id: idRef.current++, t: 'just now' }, ...f].slice(0, 8));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // Live chart
  useEffect(() => {
    const id = setInterval(() => setSeries((s) => [...s.slice(1), 40 + Math.random() * 60]), 2000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: 'Online now', value: online.toLocaleString(), sub: '● live', color: '#16A34A', live: true },
    { label: 'Total users', value: '48.2k', sub: '+6.4% MoM', color: '#8B5CF6' },
    { label: 'MRR', value: '$' + (mrr / 1000).toFixed(1) + 'k', sub: '+11% MoM', color: '#F59E0B' },
    { label: 'Lessons completed', value: lessons.toLocaleString(), sub: 'today', color: '#0284C7' },
  ];

  const max = Math.max(...series);
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ');

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-brand-900">Admin Dashboard</h1>
          <p className="font-body font-bold text-brand-600 mt-1">Real-time platform overview</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-2 bg-grass-100 text-grass-700 font-display font-extrabold text-sm px-4 py-2 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-grass-500 animate-pulse" /> Live
        </span>
      </div>

      {/* live stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border-2 border-brand-100 p-5 shadow-card">
            <div className="font-body font-bold text-brand-400 text-sm">{s.label}</div>
            <div className="font-display font-extrabold text-3xl mt-1 tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className={'font-bold text-xs mt-1 ' + (s.live ? 'text-grass-600' : 'text-brand-400')}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* live chart */}
        <div className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-extrabold text-xl text-brand-900">Active users</h3>
            <span className="font-bold text-brand-400 text-sm">last 24 min · updating</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-48">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,100 ${pts} 100,100`} fill="url(#area)" />
            <polyline points={pts} fill="none" stroke="#8B5CF6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ transition: 'all .6s ease' }} />
          </svg>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[['Avg session', '14m 20s'], ['Bounce', '18%'], ['New today', '1,204']].map((m) => (
              <div key={m[0]} className="bg-brand-50 rounded-2xl p-3 text-center"><div className="font-display font-extrabold text-brand-800">{m[1]}</div><div className="font-bold text-brand-400 text-xs">{m[0]}</div></div>
            ))}
          </div>
        </div>

        {/* live activity feed */}
        <div className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
          <h3 className="font-display font-extrabold text-xl text-brand-900 mb-3">Live activity</h3>
          <div className="flex flex-col gap-2 max-h-80 overflow-hidden">
            {feed.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-brand-50 animate-[fadeup_.4s_both]">
                <div className="w-9 h-9 rounded-xl grid place-items-center text-lg shrink-0" style={{ background: e.color + '22' }}>{e.icon}</div>
                <div className="flex-1 min-w-0"><span className="font-display font-extrabold text-brand-900">{e.who}</span> <span className="font-bold text-brand-600 text-sm">{e.text}</span></div>
                <span className="font-bold text-brand-300 text-xs shrink-0">{e.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* manage grid */}
      <div className="mt-4 bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
        <h3 className="font-display font-extrabold text-xl text-brand-900 mb-3">Manage</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[['Users', '👥'], ['Courses', '📚'], ['Payments', '💳'], ['Content', '🎬'], ['Badges', '🏆'], ['Reports', '📊']].map((m) => (
            <button key={m[0]} className="bg-brand-50 hover:bg-brand-100 rounded-2xl p-4 font-display font-extrabold text-brand-800 text-center transition"><div className="text-2xl mb-1">{m[1]}</div>{m[0]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
