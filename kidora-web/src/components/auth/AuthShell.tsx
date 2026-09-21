'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared frame for every auth screen: a drifting gradient panel on the left
 * (desktop only) and the card on the right. Keeping it in one place is what
 * lets /join, /login and /auth/callback feel like one continuous flow rather
 * than three separate pages.
 */
export function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left: brand panel. Hidden on phones, where the card is the whole screen. */}
      <aside className="relative hidden overflow-hidden bg-[length:200%_200%] bg-gradient-to-br from-brand-600 via-brand-800 to-grass-600 p-12 text-white md:flex md:flex-col md:items-center md:justify-center animate-gradient-pan">
        {/* Decorative floating shapes. */}
        <span aria-hidden className="pointer-events-none absolute -left-10 top-16 h-40 w-40 rounded-full bg-white/10 blur-xl animate-float" />
        <span aria-hidden className="pointer-events-none absolute right-6 top-1/3 h-24 w-24 rounded-3xl bg-sun-400/20 blur-md animate-float [animation-delay:1.5s]" />
        <span aria-hidden className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-grass-400/20 blur-lg animate-float [animation-delay:3s]" />

        <div className="relative animate-bob text-7xl">🎓</div>
        <h2 className="relative mt-4 text-center font-display text-4xl font-extrabold animate-slide-up">{title}</h2>
        <p className="relative mt-2 text-center font-body font-bold text-brand-100 animate-slide-up [animation-delay:.1s]">{subtitle}</p>

        <ul className="relative mt-10 space-y-3 font-body font-bold text-brand-100">
          {[
            ['📱', 'Sign in with just your phone'],
            ['🎮', 'Lessons that play like games'],
            ['📊', 'Progress parents and teachers can see'],
          ].map(([icon, text], i) => (
            <li key={text} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg">{icon}</span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: the actual form. */}
      {/* `min-w-0`: a grid item defaults to min-width:auto, which would let a
          wide child (the row of code boxes) stretch the column past the
          viewport and give the whole page a horizontal scrollbar on a phone. */}
      <main className="flex min-w-0 items-center justify-center bg-brand-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 font-display text-xl font-extrabold text-brand-800 transition hover:-translate-x-0.5 md:hidden">
            <span className="text-2xl">🎓</span> Kidora
          </Link>
          <div className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card sm:p-8 animate-slide-up">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
