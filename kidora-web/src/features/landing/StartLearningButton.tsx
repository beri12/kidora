'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * "Start Learning": instead of a hard cut to sign-up, a purple circle grows
 * out of the button until it fills the screen, and the sign-up page rises in
 * from that colour. It is a real link underneath (ctrl-click, middle-click
 * and keyboard work), and with reduced motion it simply navigates.
 */
export function StartLearningButton({ href = '/auth/signup', children, className }: { href?: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const going = useRef(false);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (prefersReducedMotion() || !ref.current) return; // plain navigation
    e.preventDefault();
    if (going.current) return;
    going.current = true;
    router.prefetch(href);

    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    const dot = document.createElement('div');
    dot.setAttribute('aria-hidden', 'true');
    Object.assign(dot.style, {
      position: 'fixed', left: `${cx - radius}px`, top: `${cy - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px`,
      borderRadius: '50%', background: 'radial-gradient(circle, #6E52F5 0%, #5B3CF0 60%, #4B2ED6 100%)', zIndex: '9998', pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(dot);

    gsap.timeline({
      onComplete: () => {
        router.push(href);
        // Fade the veil once the new page has had a moment to paint.
        gsap.to(dot, { opacity: 0, duration: 0.45, delay: 0.35, ease: 'power1.out', onComplete: () => { dot.remove(); going.current = false; } });
      },
    })
      .to(ref.current, { scale: 0.92, duration: 0.1, ease: 'power2.in' })
      .to(ref.current, { scale: 1.06, duration: 0.18, ease: 'back.out(3)' })
      .fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'power3.inOut' }, 0.12);
  }

  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      data-magnetic
      className={cn(
        'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-iris-600 px-8 font-body text-lg font-extrabold text-white shadow-[0_16px_34px_-14px_rgba(91,60,240,.8)] transition-colors hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-iris-300',
        className,
      )}
    >
      {children}
    </Link>
  );
}
