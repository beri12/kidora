'use client';

import Link from 'next/link';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MotionConfig, motion } from 'framer-motion';
import { Navbar } from '@/components/navbar/Navbar';
import { gamesApi } from '@/lib/api/games';
import { SUBJECT_LABEL, WORLDS } from '@/lib/games/worlds';
import { useAuthStore } from '@/stores/auth.store';

/** A game's landing screen: the story, what you'll learn, and its levels. */
export default function GameLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  useEffect(() => { if (hydrated && !user) router.replace(`/login?next=/games/${slug}`); }, [hydrated, user, router, slug]);

  const q = useQuery({ queryKey: ['games', slug], queryFn: () => gamesApi.detail(slug), enabled: Boolean(user) });
  const g = q.data;
  const w = WORLDS[g?.world ?? 'MATH_ISLAND'];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen" style={{ background: `linear-gradient(${w.sky[0]}, ${w.sky[1]})` }}>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
          <Link href="/games" className="inline-flex min-h-11 items-center font-display font-extrabold text-slate-700">← All worlds</Link>
          {q.isLoading && <div className="mt-6 h-64 animate-pulse rounded-[28px] bg-white/60" />}
          {q.isError && <p role="alert" className="mt-6 rounded-3xl bg-white p-6 text-center font-display text-xl font-extrabold">We couldn&apos;t find that game.</p>}
          {g && (
            <>
              <header className="mt-2 text-center">
                <motion.div className="text-7xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} aria-hidden>{w.emoji}</motion.div>
                <h1 className="font-display text-4xl font-extrabold text-slate-900">{g.name}</h1>
                <p className="mt-1 font-body text-lg font-bold text-slate-700">{g.description}</p>
                <p className="mt-1 font-body text-sm font-bold text-slate-500">{w.name} · {SUBJECT_LABEL[g.subject] ?? g.subject} · Grades {g.minGrade}–{g.maxGrade}</p>
              </header>
              <ol className="mt-8 space-y-4">
                {g.levels.map((l, i) => (
                  <motion.li key={l.order} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className={`rounded-[24px] bg-white p-5 shadow ${l.unlocked ? '' : 'opacity-75'}`}>
                    <div className="flex items-start gap-4">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-2xl font-extrabold text-white" style={{ background: w.accent }}>
                        {l.unlocked ? l.order : '🔒'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-xl font-extrabold text-slate-900">{l.name}</h2>
                        <p className="font-body text-sm font-bold text-slate-600">🎯 {l.learningObjective}</p>
                        <p className="mt-1 font-body text-xs font-bold text-slate-500">{l.challenges} challenges · up to ⭐ {l.xp} XP{l.completed ? ` · ${'⭐'.repeat(l.stars)}` : ''}</p>
                      </div>
                    </div>
                    {l.unlocked ? (
                      <Link href={`/games/${g.slug}/play?level=${l.order}`} className="mt-4 flex min-h-12 items-center justify-center rounded-full font-display text-lg font-extrabold text-white" style={{ background: w.accent }}>
                        {l.completed ? '↻ Play again' : '▶ Play'}
                      </Link>
                    ) : (
                      <p className="mt-3 font-body text-sm font-bold text-slate-500">Finish level {l.order - 1} to unlock.</p>
                    )}
                  </motion.li>
                ))}
              </ol>
            </>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}
