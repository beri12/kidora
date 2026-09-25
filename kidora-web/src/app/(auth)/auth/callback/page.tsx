'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthShell, AuthStep } from '@/components/auth/AuthShell';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { NEXT_KEY } from '@/components/auth/SocialButtons';
import { Button } from '@/components/ui/button';
import { ROLE_HOME } from '@/constants';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

type State = 'working' | 'role' | 'verify' | 'pending' | 'error';

/**
 * Landing page for every social login.
 *
 * The API redirects here with the token pair in the URL fragment
 * (#accessToken=…&refreshToken=…&needsRole=1). A fragment never reaches a
 * server or a proxy log, which is why the tokens travel that way — this page
 * reads them, wipes the fragment from the address bar, and continues into
 * the role step or the dashboard.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [state, setState] = useState<State>('working');
  // Why the provider round trip failed, from the API's #error=… fragment.
  const [failure, setFailure] = useState<{ reason: string; provider: string }>({ reason: 'failed', provider: '' });
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');
  const ran = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; the fragment is consumed once.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const needsRole = params.get('needsRole') === '1';
    const oauthError = params.get('error');

    // Don't leave tokens sitting in the address bar or in history.
    window.history.replaceState(null, '', window.location.pathname);

    if (oauthError) {
      setFailure({ reason: oauthError, provider: params.get('provider') ?? '' });
      setState('error');
      return;
    }

    if (!accessToken || !refreshToken) {
      setState('error');
      return;
    }

    setTokens(accessToken, refreshToken).then((user) => {
      if (!user) { setState('error'); return; }
      if (needsRole || user.roleConfirmed === false) { setState('role'); return; }
      finish(user.role);
    });
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
    await celebrate(500);
    router.replace(next || ROLE_HOME[role] || '/');
  }

  return (
    <AuthShell
      title={state === 'working' ? 'Signing you in…' : 'Almost there!'}
      subtitle={
        state === 'pending'
          ? "We're verifying your organisation."
          : state === 'verify'
            ? 'One check and your dashboard is ready.'
            : state === 'role'
              ? 'One question and you are in.'
              : 'This only takes a second.'
      }
    >
      {state === 'working' && (
        <div className="py-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-5 font-display text-xl font-extrabold text-brand-900">Signing you in…</p>
          <p className="mt-1 font-body font-bold text-brand-500">Hang tight, we&apos;re setting things up.</p>
        </div>
      )}

      {state === 'role' && (
        <AuthStep key="role">
          <RolePicker
            onDone={finish}
            onNeedsVerification={(r) => { setVerifyRole(r); setState('verify'); }}
          />
        </AuthStep>
      )}

      {state === 'verify' && (
        <OrgVerifyForm
          role={verifyRole}
          onBack={() => setState('role')}
          onSubmitted={(res) => {
            if (res.roleGranted) finish(res.request.requestedRole as Role);
            else setState('pending');
          }}
        />
      )}

      {state === 'pending' && <PendingApproval />}

      {state === 'error' && (
        <div className="py-8 text-center animate-slide-up">
          <div className="text-5xl">{failure.reason === 'cancelled' ? '👋' : '😕'}</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-900">
            {failure.reason === 'cancelled' ? 'Sign-in cancelled' : 'That sign-in didn\'t finish'}
          </h1>
          <p className="mt-1 font-body font-bold text-brand-500">
            {failure.reason === 'cancelled'
              ? `No problem — nothing was shared with Kidora. You can try ${providerName(failure.provider) || 'another way'} again, or use your phone or email.`
              : 'The link may have expired. Try again — it usually works the second time.'}
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/join')}>
            Back to sign in
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

function providerName(id: string) {
  return ({ google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' } as Record<string, string>)[id] ?? '';
}
