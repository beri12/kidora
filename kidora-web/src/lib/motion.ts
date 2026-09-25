'use client';

import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { gsap } from 'gsap';

/**
 * Small GSAP toolkit for the sign-up and sign-in screens.
 *
 * Every animation goes through `useGsap`, which scopes selectors to one
 * element, reverts everything on unmount (no tweens left running against
 * detached nodes), and does nothing at all for visitors who asked their OS
 * for reduced motion — the content is simply there.
 */

/** useLayoutEffect in the browser, useEffect on the server (no SSR warning). */
export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs `setup` inside a gsap.context scoped to `scope`, before paint, and
 * reverts it on unmount or when `deps` change.
 */
export function useGsap(
  setup: (ctx: gsap.Context) => void | (() => void),
  scope: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
) {
  useIsoLayoutEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const ctx = gsap.context((self) => setup(self), scope);
    return () => ctx.revert();
  }, deps);
}

/** Shakes an element, for a wrong code or a rejected form. */
export function shake(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { x: 0 }, { x: 0, duration: 0.5, ease: 'none', keyframes: { x: [0, -10, 10, -6, 6, -2, 0] } });
}

const BURST = ['⭐', '✨', '🎈', '📚', '🎨', '🚀', '💜', '🎉'];

/**
 * Emoji confetti bursting out of an element's centre. Particles are appended
 * to <body> in fixed position, so they fly over everything and are removed
 * when their tween ends.
 */
export function emojiBurst(from: Element | null, count = 14) {
  if (!from || prefersReducedMotion() || typeof document === 'undefined') return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.textContent = BURST[i % BURST.length];
    p.setAttribute('aria-hidden', 'true');
    Object.assign(p.style, {
      position: 'fixed',
      left: `${cx}px`,
      top: `${cy}px`,
      fontSize: `${16 + Math.random() * 14}px`,
      pointerEvents: 'none',
      zIndex: '9999',
      willChange: 'transform, opacity',
    } as CSSStyleDeclaration);
    document.body.appendChild(p);

    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 70 + Math.random() * 90;
    gsap.fromTo(
      p,
      { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.2, rotation: 0, opacity: 1 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 30,
        scale: 1,
        rotation: (Math.random() - 0.5) * 240,
        duration: 0.8 + Math.random() * 0.3,
        ease: 'power3.out',
        onComplete: () => {
          gsap.to(p, { y: '+=40', opacity: 0, duration: 0.35, ease: 'power1.in', onComplete: () => p.remove() });
        },
      },
    );
  }
}

/**
 * The "you're in" moment before routing to a dashboard: confetti from both
 * sides of the screen. Resolves after a short beat so the navigation does not
 * cut the celebration off mid-frame.
 */
export async function celebrate(ms = 650) {
  if (prefersReducedMotion() || typeof window === 'undefined') return;
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = ['#8B5CF6', '#22C55E', '#FACC15', '#FB7185', '#60A5FA'];
    confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors });
    confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors });
  } catch {
    // Confetti is decoration; never block sign-in on it.
  }
  await new Promise((r) => setTimeout(r, ms));
}
