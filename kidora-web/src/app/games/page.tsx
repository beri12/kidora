'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MotionConfig, motion } from 'framer-motion';
import { Navbar } from '@/components/navbar/Navbar';
import { gamesApi } from '@/lib/api/games';
import { MAP_ORDER, SUBJECT_LABEL, WORLDS } from '@/lib/games/worlds';
import { useAuthStore } from '@/stores/auth.store';

/**
 * KIDORA WORLDS — the games home. Five worlds on a winding map; each card
 * shows the world's game, grades, progress and the XP it holds.
 */
export default function GamesPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  useEffect(() => { if (hydrated && !user) router.replace('/login?next=/games'); }, [hydrated, user, router]);

  const games = useQuery({ queryKey: ['games'], queryFn: gamesApi.list, enabled: Boolean(user) });
  const recs = useQuery({ queryKey: ['games', 'recommendations'], queryFn: gamesApi.recommendations, enabled: Boolean(user) });
  const byWorld = new Map((games.data ?? []).map((g) => [g.world, g]));
  const rec = recs.data?.[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-[#F4F1FF] to-emerald-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
          <header className="text-center">
            <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-4xl font-extrabold text-[#1B1446] sm:text-5xl">🌍 Kidora Worlds</motion.h1>
            <p className="mt-2 font-body text-lg font-bold text-slate-600">Where do you want to learn today?</p>
          </header>

          {rec && (
            <Link href={`/games/${rec.game}/play?level=${rec.level}`} className="mx-auto mt-6 flex max-w-xl items-center gap-3 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 shadow-sm hover:-translate-y-0.5">
              <span className="text-4xl" aria-hidden>🎯</span>
              <span className="flex-1">
                <span className="block font-display text-lg font-extrabold text-amber-900">Try this {rec.minutes}-minute challenge</span>
                <span className="block font-body text-sm font-bold text-amber-800">{rec.gameName} · {rec.levelName} — {rec.reason}</span>
              </span>
              <span className="font-display font-extrabold text-amber-900" aria-hidden>▶</span>
            </Link>
          )}

          {games.isError && (
            <div role="alert" className="mx-auto mt-8 max-w-md rounded-3xl bg-white p-6 text-center shadow">
              <p className="font-display text-xl font-extrabold">We couldn&apos;t load the worlds.</p>
              <button onClick={() => games.refetch()} className="mt-3 min-h-11 rounded-full bg-brand-700 px-6 font-display font-extrabold text-white">Try again</button>
            </div>
          )}

          <ol className="relative mt-10 space-y-8">
            {/* The winding trail between worlds. */}
            <span aria-hidden className="absolute left-1/2 top-4 hidden h-[calc(100%-2rem)] w-1 -translate-x-1/2 rounded-full border-l-4 border-dashed border-white sm:block" />
            {MAP_ORDER.map((key, i) => {
              const w = WORLDS[key];
              const g = byWorld.get(key);
              return (
                <motion.li key={key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }}
                  className={`relative flex ${i % 2 ? 'sm:justify-end' : 'sm:justify-start'}`}>
                  <motion.div whileHover={{ y: -6 }} className="w-full overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_-24px_rgba(60,40,140,.45)] sm:w-[46%]">
                    <div className="relative grid h-36 place-items-center" style={{ background: `linear-gradient(135deg, ${w.sky[0]}, ${w.ground})` }} aria-hidden>
                      <motion.span className="text-7xl drop-shadow" animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }} transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}>{w.emoji}</motion.span>
                      {w.props.map((p, j) => (
                        <motion.span key={p} className="absolute text-2xl" style={{ left: `${15 + j * 32}%`, top: `${j % 2 ? 62 : 14}%` }}
                          animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: j * 0.4 }}>{p}</motion.span>
                      ))}
                    </div>
                    <div className="p-5">
                      <p className="font-body text-xs font-extrabold uppercase tracking-wide text-slate-400">{w.name}</p>
                      <h2 className="font-display text-2xl font-extrabold text-slate-900">{g?.name ?? w.name}</h2>
                      <p className="font-body font-bold text-slate-600">{g?.tagline ?? w.blurb}</p>
                      {g ? (
                        <>
                          <p className="mt-2 font-body text-sm font-bold text-slate-500">
                            {SUBJECT_LABEL[g.subject] ?? g.subject} · Grades {g.minGrade}–{g.maxGrade} · ⭐ {g.xpAvailable} XP
                          </p>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name} progress`}>
                            <div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: w.accent }} />
                          </div>
                          <p className="mt-1 font-body text-xs font-bold text-slate-500">{g.completedLevels}/{g.levels} levels · {g.progress}%</p>
                          <Link href={`/games/${g.slug}`} className="mt-4 flex min-h-12 items-center justify-center rounded-full font-display text-lg font-extrabold text-white shadow" style={{ background: w.accent }}>
                            ▶ {g.progress > 0 ? 'Continue' : 'Play'}
                          </Link>
                        </>
                      ) : games.isLoading ? (
                        <div className="mt-4 h-12 animate-pulse rounded-full bg-slate-100" />
                      ) : (
                        <p className="mt-3 font-body text-sm font-bold text-slate-400">Coming soon</p>
                      )}
                    </div>
                  </motion.div>
                </motion.li>
              );
            })}
          </ol>
        </main>
      </div>
    </MotionConfig>
  );
}
