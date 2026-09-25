'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGsap } from '@/lib/motion';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Learning things that drift around the brand panel. */
const ORBITERS = [
  { e: '📚', x: '12%', y: '14%', s: 'text-4xl' },
  { e: '✏️', x: '80%', y: '12%', s: 'text-3xl' },
  { e: '🎨', x: '86%', y: '58%', s: 'text-4xl' },
  { e: '🔬', x: '8%', y: '62%', s: 'text-3xl' },
  { e: '🧮', x: '22%', y: '86%', s: 'text-3xl' },
  { e: '⭐', x: '70%', y: '84%', s: 'text-2xl' },
  { e: '🚀', x: '50%', y: '6%', s: 'text-3xl' },
];

const FEATURES: [string, string][] = [
  ['🔐', 'Sign in with a code — no password to forget'],
  ['🎮', 'Lessons that play like games'],
  ['📊', 'Progress parents and teachers can see'],
];

/**
 * Shared frame for every auth screen: an animated brand panel on the left
 * (desktop only) and the card on the right. Keeping it in one place is what
 * lets /join, /login, /register and /auth/callback feel like one continuous
 * flow rather than separate pages.
 *
 * Motion (GSAP, skipped entirely under prefers-reduced-motion):
 *   - the mascot drops in and keeps a gentle bob
 *   - the headline bounces in letter by letter, and again whenever it changes
 *   - learning emoji float on independent, randomised paths
 *   - the card rises in with a slight 3D tilt
 *   - the panel follows the pointer with a soft parallax
 */
export function AuthShell({ title, subtitle, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);

  // One-off entrance + ambient loops.
  useGsap(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-auth-card]', { y: 40, rotationX: 12, autoAlpha: 0, transformPerspective: 900, duration: 0.8 })
      .from('[data-auth-logo]', { y: -12, autoAlpha: 0, duration: 0.4 }, 0.1)
      .from('[data-mascot]', { y: -160, rotation: -25, autoAlpha: 0, duration: 0.9, ease: 'bounce.out' }, 0.05)
      .from('[data-feature]', { x: -30, autoAlpha: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(1.7)' }, 0.5)
      .from('[data-orbiter]', { scale: 0, autoAlpha: 0, stagger: 0.06, duration: 0.5, ease: 'back.out(2.5)' }, 0.3);

    gsap.to('[data-mascot]', { y: -12, rotation: 4, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });

    gsap.utils.toArray<HTMLElement>('[data-orbiter]').forEach((el) => {
      const drift = () =>
        gsap.to(el, {
          x: gsap.utils.random(-28, 28),
          y: gsap.utils.random(-28, 28),
          rotation: gsap.utils.random(-18, 18),
          duration: gsap.utils.random(2.5, 4.5),
          ease: 'sine.inOut',
          onComplete: drift,
        });
      drift();
    });

    // Soft parallax: the floating layer leans toward the pointer.
    const el = panel.current;
    if (!el) return;
    const toX = gsap.quickTo('[data-parallax]', 'x', { duration: 0.8, ease: 'power3.out' });
    const toY = gsap.quickTo('[data-parallax]', 'y', { duration: 0.8, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      toX(((e.clientX - r.left) / r.width - 0.5) * 30);
      toY(((e.clientY - r.top) / r.height - 0.5) * 30);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, root);

  // The headline re-animates whenever the step (and so the title) changes.
  useGsap(
    () => {
      gsap.from('[data-title-char]', { y: 40, rotation: 12, autoAlpha: 0, stagger: 0.025, duration: 0.55, ease: 'back.out(2)' });
      gsap.from('[data-subtitle]', { y: 12, autoAlpha: 0, duration: 0.45, delay: 0.2, ease: 'power2.out' });
    },
    root,
    [title, subtitle],
  );

  return (
    <div ref={root} className="grid min-h-screen md:grid-cols-2">
      {/* Left: brand panel. Hidden on phones, where the card is the whole screen. */}
      <aside
        ref={panel}
        className="relative hidden overflow-hidden bg-[length:200%_200%] bg-gradient-to-br from-brand-600 via-brand-800 to-grass-600 p-12 text-white md:flex md:flex-col md:items-center md:justify-center animate-gradient-pan"
      >
        {/* Soft glows. */}
        <span aria-hidden className="pointer-events-none absolute -left-10 top-16 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <span aria-hidden className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-grass-400/20 blur-lg" />

        <div data-parallax aria-hidden className="pointer-events-none absolute inset-0">
          {ORBITERS.map((o) => (
            <span
              key={o.e}
              data-orbiter
              className={`absolute select-none drop-shadow-lg ${o.s}`}
              style={{ left: o.x, top: o.y }}
            >
              {o.e}
            </span>
          ))}
        </div>

        <div data-mascot className="relative text-8xl drop-shadow-xl">🎓</div>

        <h2 className="relative mt-4 text-center font-display text-4xl font-extrabold" aria-label={title}>
          {/* Split per character for the bounce-in. Words stay unbroken. */}
          {title.split(' ').map((word, w) => (
            <span key={`${title}-${w}`} aria-hidden className="inline-block whitespace-nowrap">
              {Array.from(word).map((ch, i) => (
                <span key={i} data-title-char className="inline-block">{ch}</span>
              ))}
              {' '}
            </span>
          ))}
        </h2>
        <p data-subtitle className="relative mt-2 text-center font-body font-bold text-brand-100">{subtitle}</p>

        <ul className="relative mt-10 space-y-3 font-body font-bold text-brand-100">
          {FEATURES.map(([icon, text]) => (
            <li key={text} data-feature className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg backdrop-blur-sm">{icon}</span>
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
          <div data-auth-logo className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-brand-800 transition hover:-translate-x-0.5"
            >
              <span className="text-2xl">🎓</span> Kidora
            </Link>
          </div>
          <div data-auth-card className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card sm:p-8">
            {children}
          </div>
          <p className="mt-5 text-center font-body-x text-[12px] text-brand-400">
            Protected by one-time codes. We never share your number or email.
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * One step of an auth flow. Give it a `key` that changes per step so React
 * remounts it; it then slides in and staggers anything marked `data-stagger`.
 */
export function AuthStep({ children, back = false }: { children: ReactNode; back?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(ref.current, { x: back ? -36 : 36, autoAlpha: 0, duration: 0.45 });
    const items = ref.current?.querySelectorAll('[data-stagger]');
    if (items?.length) tl.from(items, { y: 16, autoAlpha: 0, duration: 0.4, stagger: 0.06, ease: 'back.out(1.6)' }, '-=0.25');
  }, ref);
  return <div ref={ref}>{children}</div>;
}
