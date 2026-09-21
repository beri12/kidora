'use client';

import { useEffect, useState } from 'react';
import { api, API_URL } from '@/lib/axios';

/** Where the visitor wanted to go before the OAuth redirect. */
export const NEXT_KEY = 'kidora.next';

interface Props {
  disabled?: boolean;
  /** Path to return to after the provider redirects back. */
  next?: string | null;
}

/** Providers this component can render, in the order they are offered. */
const SECONDARY = ['facebook', 'tiktok'] as const;

/**
 * Social sign-in.
 *
 * Google is the one primary button; Facebook and TikTok live behind "More
 * ways to sign in" so the first screen stays a phone number and one choice.
 * Each button is a plain link to the API's OAuth start route — the provider
 * redirects back to /auth/callback with the tokens in the URL fragment.
 */
export function SocialButtons({ disabled, next }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Ask the API which providers have credentials on this deployment, so a
  // button never leads to a "not configured" error page. Google is assumed
  // until the answer arrives — it is the one almost every install has — and
  // a failed lookup leaves that assumption in place rather than an empty card.
  const [enabled, setEnabled] = useState<string[]>(['google']);

  useEffect(() => {
    let alive = true;
    api
      .get<{ providers: string[] }>('/auth/providers')
      .then(({ data }) => { if (alive) setEnabled(data.providers ?? []); })
      .catch(() => { /* keep the optimistic default */ });
    return () => { alive = false; };
  }, []);

  const has = (p: string) => enabled.includes(p);
  const secondary = SECONDARY.filter(has);

  const href = (provider: string) => `${API_URL}/auth/${provider}`;

  // The provider round-trip cannot carry our own query params, so the
  // destination is parked in sessionStorage and picked up by /auth/callback.
  const remember = () => {
    try {
      if (next) sessionStorage.setItem(NEXT_KEY, next);
      else sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // Private mode / storage disabled — the callback just uses the default.
    }
  };

  // Nothing configured: render nothing at all, divider included, rather than
  // an "or" leading to an empty space.
  if (!has('google') && secondary.length === 0) return null;

  return (
    <div>
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-brand-200" />
        <span className="font-body-x text-[12px] uppercase tracking-wide text-brand-400">or</span>
        <span className="h-px flex-1 bg-brand-200" />
      </div>

      {has('google') && (
        <ProviderLink
          href={href('google')}
          onClick={remember}
          disabled={disabled}
          label="Continue with Google"
          icon={<GoogleIcon />}
        />
      )}

      {secondary.length > 0 && (
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 font-body font-extrabold text-brand-500 transition hover:text-brand-700"
      >
        More ways to sign in
        <svg
          viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={'h-4 w-4 transition-transform duration-300 ' + (expanded ? 'rotate-180' : '')}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>
      )}

      {/* Grid-rows trick: animates open and closed without a fixed height. */}
      <div
        className={
          'grid transition-all duration-300 ease-out ' +
          (expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')
        }
      >
        <div className="overflow-hidden">
          <div className="space-y-3 pt-3">
            {has('facebook') && (
              <ProviderLink href={href('facebook')} onClick={remember} disabled={disabled} label="Continue with Facebook" icon={<FacebookIcon />} />
            )}
            {has('tiktok') && (
              <ProviderLink href={href('tiktok')} onClick={remember} disabled={disabled} label="Continue with TikTok" icon={<TiktokIcon />} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderLink({
  href,
  label,
  icon,
  disabled,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      onClick={onClick}
      aria-disabled={disabled}
      className={
        'flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-brand-200 bg-white px-5 py-3.5 font-display font-extrabold text-brand-800 transition-all duration-200 ' +
        (disabled
          ? 'pointer-events-none opacity-60'
          : 'hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-card active:translate-y-0 active:scale-[.98]')
      }
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center">{icon}</span>
      {label}
    </a>
  );
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
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M16.6 2h-3v13.4a2.7 2.7 0 1 1-2.2-2.7V9.6a5.8 5.8 0 1 0 5.2 5.8V9.1a6.9 6.9 0 0 0 4 1.3V7.3a4 4 0 0 1-4-4Z"
      />
    </svg>
  );
}
