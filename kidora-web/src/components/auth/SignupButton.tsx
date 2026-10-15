'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { emojiBurst, prefersReducedMotion, useGsap } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface Props {
  href?: string;
  children: ReactNode;
  className?: string;
  /** Runs before navigating, e.g. to close the mobile menu. */
  onNavigate?: () => void;
  /** A slow shine and nudge every few seconds while idle, to draw the eye. */
  attract?: boolean;
}

/**
 * The "Sign up" call to action, animated with GSAP.
 *
 *   idle   a light sweep across the button and a small nudge every few seconds
 *   hover  lifts and grows slightly
 *   click  squash-and-stretch, a ripple from the pointer, a burst of learning
 *          emoji, the label flips to "Let's go! 🚀" — then it navigates
 *
 * It is a real link underneath (middle-click, ctrl-click and keyboard all
 * work), and under prefers-reduced-motion it simply navigates.
 */
export function SignupButton({ href = '/auth/signup', children, className, onNavigate, attract = true }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const [going, setGoing] = useState(false);

  useGsap(() => {
    if (!attract) return;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.2, delay: 1.5 });
    tl.fromTo('[data-shine]', { xPercent: -120 }, { xPercent: 320, duration: 0.9, ease: 'power2.inOut' })
      .to(ref.current, { rotation: -3, duration: 0.09, ease: 'sine.inOut' }, 0.2)
      .to(ref.current, { rotation: 3, duration: 0.09, repeat: 3, yoyo: true, ease: 'sine.inOut' })
      .to(ref.current, { rotation: 0, duration: 0.1 });
  }, ref);

  function hover(on: boolean) {
    if (prefersReducedMotion() || going) return;
    gsap.to(ref.current, { scale: on ? 1.06 : 1, y: on ? -2 : 0, duration: 0.3, ease: 'back.out(2.5)' });
  }

  function click(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle new-tab / new-window clicks untouched.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (prefersReducedMotion() || going) { onNavigate?.(); return; }
    e.preventDefault();
    setGoing(true);
    router.prefetch(href);

    const el = ref.current!;
    const r = el.getBoundingClientRect();

    // Ripple from where the pointer landed (or the centre, for the keyboard).
    const ripple = document.createElement('span');
    const x = e.clientX ? e.clientX - r.left : r.width / 2;
    const y = e.clientY ? e.clientY - r.top : r.height / 2;
    Object.assign(ripple.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`, width: '12px', height: '12px',
      borderRadius: '9999px', background: 'rgba(255,255,255,.55)', pointerEvents: 'none',
      transform: 'translate(-50%,-50%)',
    } as CSSStyleDeclaration);
    el.appendChild(ripple);

    gsap.timeline({
      onComplete: () => {
        ripple.remove();
        onNavigate?.();
        router.push(href);
      },
    })
      .to(el, { scaleX: 1.18, scaleY: 0.82, duration: 0.1, ease: 'power2.out' })
      .to(ripple, { scale: Math.max(r.width, r.height) / 4, opacity: 0, duration: 0.55, ease: 'power2.out' }, 0)
      .add(() => emojiBurst(el, 16), 0.08)
      .to(el, { scaleX: 0.9, scaleY: 1.12, duration: 0.12, ease: 'power2.inOut' })
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.4)' })
      .to(el.querySelector('[data-label]'), { yPercent: -100, duration: 0.25, ease: 'back.in(2)' }, 0.1)
      .fromTo(el.querySelector('[data-go]'), { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: 'back.out(2)' }, 0.3);
  }

  return (
    <Link
      ref={ref}
      href={href}
      onClick={click}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      aria-busy={going}
      className={cn('relative inline-flex items-center justify-center overflow-hidden will-change-transform', className)}
    >
      <span data-shine aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ transform: 'translateX(-120%)' }} />
      <span className="relative block overflow-hidden">
        <span data-label className="block whitespace-nowrap">{children}</span>
        <span data-go aria-hidden className="absolute inset-0 flex items-center justify-center whitespace-nowrap" style={{ transform: 'translateY(100%)' }}>
          Let&apos;s go 🚀
        </span>
      </span>
    </Link>
  );
}
