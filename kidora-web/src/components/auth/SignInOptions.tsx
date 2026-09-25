'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, API_URL } from '@/lib/axios';
import { SocialLoginButton } from './scene/KidoraAuthScene';
import { FacebookIcon, GoogleIcon, TiktokIcon } from './scene/icons';

/** Where the visitor wanted to go before the OAuth redirect. */
export const NEXT_KEY = 'kidora.next';

interface Props {
  onPhone: () => void;
  onEmail: () => void;
  /** "Sign in with email" on /login, "Sign up with email" on /join. */
  emailLabel: string;
  next?: string | null;
  disabled?: boolean;
}

type Provider = 'google' | 'tiktok' | 'facebook';

/**
 * The first screen of sign-in and sign-up: three big choices — Google,
 * Phone, TikTok — with email one quiet link below them. Facebook, when a
 * deployment enables it, sits behind "More options" rather than crowding
 * the main screen.
 *
 * Social buttons are plain links to the API's OAuth start routes: the client
 * secret never reaches the browser. The API is asked first which providers
 * are configured, so a button that could only fail is never shown.
 */
export function SignInOptions({ onPhone, onEmail, emailLabel, next, disabled }: Props) {
  const [enabled, setEnabled] = useState<Provider[] | null>(null);
  const [leaving, setLeaving] = useState<Provider | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<{ providers: string[] }>('/auth/providers')
      .then(({ data }) => { if (alive) setEnabled((data.providers ?? []) as Provider[]); })
      .catch(() => { if (alive) setEnabled([]); });
    return () => { alive = false; };
  }, []);

  const has = (p: Provider) => Boolean(enabled?.includes(p));

  // The provider round trip cannot carry our own query params, so the
  // destination is parked in sessionStorage and picked up by /auth/callback.
  const go = (p: Provider) => {
    try {
      if (next) sessionStorage.setItem(NEXT_KEY, next);
      else sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // Private mode / storage disabled — the callback uses the default.
    }
    setLeaving(p);
  };

  const off = disabled || leaving !== null;
  const item = (key: string, node: React.ReactNode, i: number) => (
    <motion.li
      key={key}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay: i * 0.06 }}
    >
      {node}
    </motion.li>
  );

  return (
    <div>
      <ul className="space-y-3">
        <AnimatePresence initial>
          {has('google') && item('google', (
            <SocialLoginButton
              variant="google" label={leaving === 'google' ? 'Opening Google…' : 'Continue with Google'}
              icon={<GoogleIcon />} href={`${API_URL}/auth/google`} onClick={() => go('google')}
              disabled={off && leaving !== 'google'} busy={leaving === 'google'}
            />
          ), 0)}
          {item('phone', (
            <SocialLoginButton variant="phone" label="Continue with Phone" icon={<span className="text-2xl">📱</span>} onClick={onPhone} disabled={off} />
          ), 1)}
          {has('tiktok') && item('tiktok', (
            <SocialLoginButton
              variant="tiktok" label={leaving === 'tiktok' ? 'Opening TikTok…' : 'Continue with TikTok'}
              icon={<TiktokIcon />} href={`${API_URL}/auth/tiktok`} onClick={() => go('tiktok')}
              disabled={off && leaving !== 'tiktok'} busy={leaving === 'tiktok'}
            />
          ), 2)}
          {more && has('facebook') && item('facebook', (
            <SocialLoginButton
              variant="facebook" label="Continue with Facebook" icon={<FacebookIcon />}
              href={`${API_URL}/auth/facebook`} onClick={() => go('facebook')} disabled={off}
            />
          ), 0)}
        </AnimatePresence>
      </ul>

      {enabled === null && (
        <p className="mt-2 text-center font-body-x text-[12px] text-brand-400" aria-live="polite">Loading sign-in options…</p>
      )}

      {has('facebook') && !more && (
        <button type="button" onClick={() => setMore(true)} className="mt-2 min-h-11 w-full font-body font-extrabold text-brand-500 hover:text-brand-700">
          More options
        </button>
      )}

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-brand-200" />
        <span className="font-body-x text-[12px] uppercase tracking-wide text-brand-400">or</span>
        <span className="h-px flex-1 bg-brand-200" />
      </div>

      <button
        type="button"
        onClick={onEmail}
        disabled={off}
        className="min-h-11 w-full rounded-xl font-display text-lg font-extrabold text-brand-700 underline-offset-4 hover:underline"
      >
        ✉️ {emailLabel}
      </button>
    </div>
  );
}
