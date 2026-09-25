'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion } from 'framer-motion';

/**
 * The world every sign-in and sign-up screen happens in: a soft sky, drifting
 * clouds, twinkling stars, Kidora's fox guide, and the card in the middle.
 *
 * Motion rules (all Framer Motion):
 *   - entrances and state changes stay within 200–500 ms, so signing in never
 *     waits on an animation;
 *   - decorative loops (clouds, stars, the fox's bob) are skipped entirely
 *     when the OS asks for reduced motion — MotionConfig reducedMotion="user"
 *     handles transforms, and the loops below check useReducedMotion();
 *   - nothing decorative is focusable or announced (aria-hidden).
 */
export function KidoraAuthScene({ children, greeting, wide = false }: { children: ReactNode; greeting: string; wide?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-[#F4F1FF]">
        <SkyDecor />
        <main className={`relative z-10 mx-auto flex min-h-screen w-full flex-col items-center px-4 pb-10 pt-6 transition-[max-width] duration-300 sm:pt-10 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
          <Link
            href="/"
            className="mb-2 inline-flex min-h-11 items-center gap-2 self-start font-display text-xl font-extrabold text-brand-800"
          >
            <span className="text-2xl" aria-hidden>⭐</span> Kidora
          </Link>
          <AnimatedCharacter greeting={greeting} />
          <AuthCard>{children}</AuthCard>
          <p className="mt-5 text-center font-body-x text-[12px] text-brand-500">
            Protected by one-time codes. We never share your number or email.
          </p>
        </main>
      </div>
    </MotionConfig>
  );
}

/** Kidora's fox guide, with a speech bubble that changes with the step. */
export function AnimatedCharacter({ greeting }: { greeting: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          key={greeting}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="relative mb-1 rounded-2xl bg-white px-4 py-2 font-display text-base font-extrabold text-brand-800 shadow-md"
        >
          {greeting}
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        </motion.div>
      </AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0, rotate: -12 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, duration: 0.5 }}
        className="text-7xl drop-shadow-lg"
      >
        <motion.span
          className="inline-block"
          animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -3, 0, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🦊
        </motion.span>
      </motion.div>
    </div>
  );
}

/** The white card the steps live in. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 w-full rounded-[28px] border-2 border-white bg-white/95 p-6 shadow-[0_24px_48px_-24px_rgba(60,40,140,.45)] backdrop-blur sm:p-7"
    >
      {children}
    </motion.div>
  );
}

export function FloatingCloud({ className, delay = 0 }: { className: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`absolute rounded-full bg-white/80 ${className}`}
      animate={reduce ? undefined : { x: [0, 24, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export function FloatingStar({ className, delay = 0, char = '⭐' }: { className: string; delay?: number; char?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`absolute select-none ${className}`}
      animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, 12, 0], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {char}
    </motion.span>
  );
}

function SkyDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <FloatingCloud className="left-[-30px] top-16 h-14 w-40" />
      <FloatingCloud className="right-[-20px] top-40 h-12 w-32" delay={1.5} />
      <FloatingCloud className="left-[10%] bottom-24 h-16 w-52 opacity-70" delay={3} />
      <FloatingCloud className="right-[8%] bottom-10 h-10 w-36 opacity-80" delay={2} />
      <FloatingStar className="left-[18%] top-8 hidden text-2xl sm:block" />
      <FloatingStar className="right-[16%] top-20 text-xl" delay={0.8} char="✨" />
      <FloatingStar className="right-[10%] top-[55%] text-2xl" delay={1.6} />
      <FloatingStar className="left-[7%] top-[45%] text-xl" delay={2.2} char="✨" />
    </div>
  );
}

/**
 * A step inside the card. Give it a `key` per step: it slides in from the
 * right going forward, from the left going back.
 */
export function AuthStep({ children, back = false }: { children: ReactNode; back?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: back ? -28 : 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: back ? 28 : -28, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A large sign-in button. 56 px tall, comfortably above the 44 px touch
 * target, with hover lift and press squish.
 */
export function SocialLoginButton({
  icon, label, onClick, href, variant, disabled, busy,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  variant: 'google' | 'phone' | 'tiktok' | 'facebook';
  disabled?: boolean;
  busy?: boolean;
}) {
  const styles = {
    google: 'border-2 border-slate-200 bg-white text-slate-800 hover:border-slate-300',
    phone: 'border-2 border-brand-700 bg-brand-700 text-white hover:bg-brand-800',
    tiktok: 'border-2 border-black bg-black text-white hover:bg-neutral-800',
    facebook: 'border-2 border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166FE5]',
  }[variant];
  const cls =
    'flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 font-display text-lg font-extrabold shadow-sm outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-300 ' +
    styles + (disabled ? ' pointer-events-none opacity-60' : '');
  const content = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center" aria-hidden>
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      </span>
      {label}
    </>
  );
  const motionProps = { whileHover: { y: -2 }, whileTap: { scale: 0.97 }, transition: { duration: 0.2 } };
  return href ? (
    <motion.a href={disabled ? undefined : href} onClick={onClick} aria-disabled={disabled} className={cls} {...motionProps}>
      {content}
    </motion.a>
  ) : (
    <motion.button type="button" onClick={onClick} disabled={disabled} className={cls} {...motionProps}>
      {content}
    </motion.button>
  );
}

/** "You're in!" — shown for a moment between a successful sign-in and the dashboard. */
export function SuccessAnimation({ show, label = "You're in!" }: { show: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="flex flex-col items-center"
          >
            <svg viewBox="0 0 52 52" className="h-24 w-24" aria-hidden>
              <circle cx="26" cy="26" r="24" fill="#22C55E" />
              <motion.path
                d="M15 27 l7 7 l15 -16"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              />
            </svg>
            <p className="mt-3 font-display text-2xl font-extrabold text-brand-900">{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A wobble for a wrong code or a rejected form. Returns a ref for the element
 * and a function that plays the shake (a no-op under reduced motion).
 */
export function useShake<T extends HTMLElement>() {
  const [scope, animate] = useAnimate<T>();
  const reduce = useReducedMotion();
  const play = () => {
    if (reduce || !scope.current) return;
    animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
  };
  return [scope, play] as const;
}
