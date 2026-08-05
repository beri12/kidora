'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ChildDashboard() {
  const user = useRequireAuth(['CHILD']);
  return (
    <div>
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-grass-600 rounded-3xl p-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-body font-bold opacity-90">Welcome back,</div>
          <h1 className="font-display font-extrabold text-3xl">Hi {user?.name?.split(' ')[0] ?? 'friend'}! 👋</h1>
          <div className="flex gap-2 mt-3">
            <span className="bg-white/90 text-brand-800 rounded-full px-3 py-1 font-display font-extrabold text-sm">Level 12</span>
            <span className="bg-white/20 border-2 border-white/40 rounded-full px-3 py-1 font-body-x text-sm">🔥 {user?.streak ?? 0}-day streak</span>
            <span className="bg-white/20 border-2 border-white/40 rounded-full px-3 py-1 font-body-x text-sm">⭐ {user?.points ?? 0}</span>
          </div>
        </div>
        <div className="text-6xl">🦉</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {[['📚 Continue learning', '/courses'], ['🎮 Play a game', '/games'], ['🏆 My rewards', '/dashboard/child/rewards']].map(([label, href]) => (
          <Link key={href} href={href} className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card hover:-translate-y-1 transition-transform font-display font-extrabold text-brand-900 text-lg">{label}</Link>
        ))}
      </div>
    </div>
  );
}
