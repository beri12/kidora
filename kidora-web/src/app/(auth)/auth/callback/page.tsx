'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { AuthShell } from '@/components/auth/AuthShell';
import { NEXT_KEY, PrimaryButton } from '@/components/auth/kidora/ui';
import { AUTH, destinationFor, safeNext } from '@/features/auth/routes';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';

const PROVIDER_NAME: Record<string, string> = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' };

/**
 * Landing page for every social sign-in.
 *
 * The API redirects here with a one-time code in the URL fragment
 * (#code=…) — never the tokens themselves. This page wipes the fragment from
 * the address bar, trades the code for a session at POST /auth/oauth/exchange
 * (the code dies after one use or 60 s), then continues to the role question
 * for a new account or to where the visitor was going.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const exchange = useAuthStore((s) => s.exchangeOAuthCode);
  const [failure, setFailure] = useState<{ reason: string; provider: string } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; the code can only be spent once.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('code');
    const oauthError = params.get('error');
    window.history.replaceState(null, '', window.location.pathname);

    if (oauthError || !code) {
      setFailure({ reason: oauthError ?? 'failed', provider: params.get('provider') ?? '' });
      return;
    }

    let next: string | null = null;
    try { next = safeNext(sessionStorage.getItem(NEXT_KEY)); sessionStorage.removeItem(NEXT_KEY); } catch { /* storage off */ }

    exchange(code)
      .then(async (res) => {
        if (!res.needsRole) await celebrate(450);
        router.replace(destinationFor(res.user.role, res.needsRole, next));
      })
      .catch(() => setFailure({ reason: 'failed', provider: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!failure) {
    return (
      <AuthShell title="Signing you in">
        <div className="py-8 text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-iris-600" aria-hidden />
          <p className="mt-5 font-display text-xl font-extrabold text-ink">Signing you in…</p>
        </div>
      </AuthShell>
    );
  }

  const cancelled = failure.reason === 'cancelled';
  const provider = PROVIDER_NAME[failure.provider];
  return (
    <AuthShell title={cancelled ? 'Sign-in cancelled' : 'Sign-in failed'}>
      <div className="py-2 text-center">
        <div className="text-5xl" aria-hidden>{cancelled ? '👋' : '😕'}</div>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">{cancelled ? 'Sign-in cancelled' : 'That sign-in didn’t finish'}</h1>
        <p className="mt-1 font-body font-semibold text-slate-600">
          {cancelled
            ? `Nothing was shared with Kidora. You can try ${provider ?? 'again'}, or use your email.`
            : 'The link may have expired. Try again — it usually works the second time.'}
        </p>
        <PrimaryButton className="mt-6" onClick={() => router.replace(AUTH.login)}>Back to log in</PrimaryButton>
      </div>
    </AuthShell>
  );
}
