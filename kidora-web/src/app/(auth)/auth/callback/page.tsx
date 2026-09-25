'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { AuthShell, AuthStep } from '@/components/auth/AuthShell';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { NEXT_KEY } from '@/components/auth/SignInOptions';
import { SuccessAnimation } from '@/components/auth/scene/KidoraAuthScene';
import { Button } from '@/components/ui/button';
import { ROLE_HOME } from '@/constants';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

type State = 'working' | 'role' | 'verify' | 'pending' | 'error';

const PROVIDER_NAME: Record<string, string> = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' };

/**
 * Landing page for every social sign-in.
 *
 * The API redirects here with a one-time code in the URL fragment
 * (#code=…&needsRole=1) — never the tokens themselves. This page wipes the
 * fragment from the address bar, trades the code for a session at
 * POST /auth/oauth/exchange (the code dies after one use or 60 s), and
 * continues into the role step or the dashboard.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const exchange = useAuthStore((s) => s.exchangeOAuthCode);

  const [state, setState] = useState<State>('working');
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState<{ reason: string; provider: string }>({ reason: 'failed', provider: '' });
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');
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
      setState('error');
      return;
    }

    exchange(code)
      .then((res) => (res.needsRole ? setState('role') : finish(res.user.role)))
      .catch(() => setState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(role: Role) {
    let next: string | null = null;
    try {
      next = sessionStorage.getItem(NEXT_KEY);
      sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // Storage unavailable — fall back to the role's home.
    }
    setSuccess(true);
    await celebrate(550);
    router.replace(next || ROLE_HOME[role] || '/');
  }

  const cancelled = failure.reason === 'cancelled';
  const provider = PROVIDER_NAME[failure.provider];

  return (
    <AuthShell
      title={state === 'working' ? 'Just a second… ✨' : state === 'error' ? (cancelled ? 'No problem! 👋' : 'Oops! 🙈') : 'Nice to meet you! 🌟'}
      wide={state === 'role'}
    >
      {state === 'working' && (
        <div className="py-8 text-center" role="status" aria-live="polite">
          <motion.div
            className="mx-auto h-14 w-14 rounded-full border-4 border-brand-100 border-t-brand-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-5 font-display text-xl font-extrabold text-brand-900">Signing you in…</p>
        </div>
      )}

      {state === 'role' && (
        <AuthStep key="role">
          <RolePicker onDone={finish} onNeedsVerification={(r) => { setVerifyRole(r); setState('verify'); }} />
        </AuthStep>
      )}

      {state === 'verify' && (
        <AuthStep key="verify">
          <OrgVerifyForm
            role={verifyRole}
            onBack={() => setState('role')}
            onSubmitted={(res) => (res.roleGranted ? finish(res.request.requestedRole as Role) : setState('pending'))}
          />
        </AuthStep>
      )}

      {state === 'pending' && <PendingApproval />}

      {state === 'error' && (
        <AuthStep key="error">
          <div className="py-4 text-center">
            <div className="text-5xl" aria-hidden>{cancelled ? '👋' : '😕'}</div>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-900">
              {cancelled ? 'Sign-in cancelled' : 'That sign-in didn’t finish'}
            </h1>
            <p className="mt-1 font-body font-bold text-brand-500">
              {cancelled
                ? `Nothing was shared with Kidora. You can try ${provider ?? 'again'}, or use your phone.`
                : 'The link may have expired. Try again — it usually works the second time.'}
            </p>
            <Button size="lg" className="mt-6 min-h-14 w-full" onClick={() => router.replace('/login')}>
              Back to sign in
            </Button>
          </div>
        </AuthStep>
      )}

      <SuccessAnimation show={success} />
    </AuthShell>
  );
}
