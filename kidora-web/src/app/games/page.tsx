'use client';
import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { LIVE_GAMES } from '@/constants';

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1240px] mx-auto px-6 py-10">
        <h1 className="font-display font-extrabold text-3xl text-brand-900">Games 🎮</h1>
        <p className="font-body font-bold text-brand-600 mt-1 mb-6">Solo Three.js games and live multiplayer rooms.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {LIVE_GAMES.map((g) => (
            <Link key={g.slug} href={`/games/live/${g.slug}`} className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white hover:-translate-y-1 transition-transform">
              <div className="text-4xl mb-2">🎮</div>
              <div className="font-display font-extrabold text-2xl">{g.title}</div>
              <div className="font-body font-bold text-brand-100 text-sm mt-1 capitalize">{g.subject} · {g.minPlayers > 1 ? `${g.minPlayers}+ players (live)` : 'solo or live'}</div>
              <span className="inline-block mt-4 bg-white/90 text-brand-800 rounded-xl px-4 py-2 font-display font-extrabold text-sm">Play now →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
