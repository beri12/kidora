'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api, API_URL } from '@/lib/axios';
import { prefersReducedMotion } from '@/lib/motion';

/** Where the visitor wanted to go before the OAuth redirect. */
export const NEXT_KEY = 'kidora.next';

interface Props {
  disabled?: boolean;
  /** Path to return to after the provider redirects back. */
  next?: string | null;
  /** "Continue with" on sign-up, "Sign in with" on the login page. */
  verb?: string;
}

type Provider = 'google' | 'facebook' | 'tiktok';

/** The providers offered, in order, with their brand styling. */
const PROVIDERS: { id: Provider; name: string; className: string; Icon: () => React.JSX.Element }[] = [
  {
    id: 'google',
    name: 'Google',
    className: 'border-2 border-brand-200 bg-white text-brand-900 hover:border-brand-400',
    Icon: GoogleIcon,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    className: 'border-2 border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166FE5]',
    Icon: FacebookIcon,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    className: 'border-2 border-black bg-black text-white hover:bg-neutral-800',
    Icon: TiktokIcon,
  },
];

/**
 * Social sign-in: Google, Facebook and TikTok.
 *
 * Each button is a plain link to the API's OAuth start route; the provider
 * redirects back to /auth/callback. The API is asked first which providers
 * are configured on this deployment, so a button that can only fail is never
 * shown. Until it answers, placeholder rows hold the space so nothing jumps.
 */
export function SocialButtons({ disabled, next, verb = 'Continue with' }: Props) {
  const [enabled, setEnabled] = useState<Provider[] | null>(null);
  const [leaving, setLeaving] = useState<Provider | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ providers: string[] }>('/auth/providers')
      .then(({ data }) => { if (alive) setEnabled((data.providers ?? []) as Provider[]); })
      // A failed lookup still offers Google — the one almost every install has.
      .catch(() => { if (alive) setEnabled(['google']); });
    return () => { alive = false; };
  }, []);

  const shown = PROVIDERS.filter((p) => enabled?.includes(p.id));

  // Buttons pop in one after another once the answer arrives.
  useEffect(() => {
    if (!list.current || !shown.length || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-provider]', { y: 18, scale: 0.94, autoAlpha: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.8)' });
    }, list);
    return () => ctx.revert();
  }, [shown.length]);

  // The provider round-trip cannot carry our own query params, so the
  // destination is parked in sessionStorage and picked up by /auth/callback.
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: Provider) => {
    try {
      if (next) sessionStorage.setItem(NEXT_KEY, next);
      else sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // Private mode / storage disabled — the callback just uses the default.
    }
    setLeaving(id);
    if (prefersReducedMotion()) return;
    // A quick press-and-release before the browser leaves for the provider.
    e.preventDefault();
    const href = e.currentTarget.href;
    // The wrapper, not the link: the link's CSS hover transition would fight it.
    const wrap = e.currentTarget.parentElement;
    gsap.timeline({ onComplete: () => { window.location.href = href; } })
      .to(wrap, { scale: 0.96, duration: 0.08 })
      .to(wrap, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
  };

  // Configured providers: none. Render nothing, divider included.
  if (enabled && shown.length === 0) return null;

  return (
    <div>
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-brand-200" />
        <span className="font-body-x text-[12px] uppercase tracking-wide text-brand-400">or</span>
        <span className="h-px flex-1 bg-brand-200" />
      </div>

      <div ref={list} className="space-y-3">
        {enabled === null
          ? [0, 1, 2].map((i) => (
              <div key={i} className="relative h-[52px] overflow-hidden rounded-2xl bg-brand-100">
                <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer" />
              </div>
            ))
          : shown.map(({ id, name, className, Icon }) => {
              const busy = leaving === id;
              const off = disabled || (leaving !== null && !busy);
              // GSAP animates the wrapper, the link keeps its CSS hover transitions.
              return (
                <div key={id} data-provider>
                <a
                  href={off ? undefined : `${API_URL}/auth/${id}`}
                  onClick={(e) => go(e, id)}
                  aria-disabled={off}
                  className={
                    'flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl px-5 font-display font-extrabold transition-all duration-200 ' +
                    className +
                    (off ? ' pointer-events-none opacity-60' : ' hover:-translate-y-0.5 hover:shadow-card active:translate-y-0')
                  }
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center">
                    {busy ? <Spinner /> : <Icon />}
                  </span>
                  {busy ? `Opening ${name}…` : `${verb} ${name}`}
                </a>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" aria-hidden />;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#25F4EE" d="M15.6 1.5h-3v13.4a2.7 2.7 0 1 1-2.2-2.7V9.1a5.8 5.8 0 1 0 5.2 5.8V8.6a6.9 6.9 0 0 0 4 1.3V6.8a4 4 0 0 1-4-4Z" transform="translate(-.6 -.4)" />
      <path fill="#FE2C55" d="M15.6 1.5h-3v13.4a2.7 2.7 0 1 1-2.2-2.7V9.1a5.8 5.8 0 1 0 5.2 5.8V8.6a6.9 6.9 0 0 0 4 1.3V6.8a4 4 0 0 1-4-4Z" transform="translate(.6 .4)" />
      <path fill="currentColor" d="M15.6 1.5h-3v13.4a2.7 2.7 0 1 1-2.2-2.7V9.1a5.8 5.8 0 1 0 5.2 5.8V8.6a6.9 6.9 0 0 0 4 1.3V6.8a4 4 0 0 1-4-4Z" />
    </svg>
  );
}
