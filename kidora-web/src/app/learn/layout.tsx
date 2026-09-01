'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useStudentHome } from '@/features/student/hooks';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { XPBar } from '@/components/shared/XPBar';
import { Skeleton } from '@/components/ui/states';

/**
 * The student game shell. Mobile-first: the HUD stacks on a phone and sits on
 * one line from `sm` up. Everything below it is the world the learner is in.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  const user = useRequireAuth();
  const { data, isLoading } = useStudentHome();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_75%_-5%,#DCFCE7,#F1ECFF_55%)] font-body text-brand-900">
      <header className="mx-auto max-w-[1000px] px-4 pt-5 sm:px-5">
        <div className="rounded-[28px] bg-gradient-to-br from-brand-700 to-brand-500 p-5 text-white shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/learn"
              className="flex items-center gap-3 rounded-2xl px-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            >
              <span aria-hidden className="text-4xl">🎒</span>
              <span>
                <span className="block font-body-x text-[12px] opacity-90">Kidora World</span>
                <span className="block font-display text-xl font-extrabold leading-none">
                  {data?.profile.name?.split(' ')[0] ?? 'Explorer'}
                </span>
              </span>
            </Link>

            <nav aria-label="Learning" className="ml-auto flex flex-wrap gap-2 font-display text-sm font-extrabold">
              <Link href="/learn" className="rounded-2xl bg-white/20 px-3 py-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">🗺️ Map</Link>
              <Link href="/learn/quests" className="rounded-2xl bg-white/20 px-3 py-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">📜 Quests</Link>
              <Link href="/learn/certificates" className="rounded-2xl bg-white/20 px-3 py-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">🎓 Awards</Link>
            </nav>
          </div>

          <div className="mt-4">
            {isLoading || !data ? (
              <Skeleton className="h-10 w-full bg-white/25" />
            ) : (
              <XPBar wallet={data.wallet} streak={data.profile.streak} />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-5">{children}</main>
    </div>
  );
}
