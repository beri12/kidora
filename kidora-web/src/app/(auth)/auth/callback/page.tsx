'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/auth/AuthShell';
import { RolePicker } from '@/components/auth/RolePicker';
import { NEXT_KEY } from '@/components/auth/SocialButtons';
import { Button } from '@/components/ui/button';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

type State = 'working' | 'role' | 'error';

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
  const ran = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; the fragment is consumed once.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const needsRole = params.get('needsRole') === '1';

    // Don't leave tokens sitting in the address bar or in history.
    window.history.replaceState(null, '', window.location.pathname);

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

  function finish(role: Role) {
    let next: string | null = null;
    try {
      next = sessionStorage.getItem(NEXT_KEY);
      sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // Storage unavailable — fall back to the role's home.
    }
    router.replace(next || ROLE_HOME[role] || '/');
  }

  return (
    <AuthShell
      title={state === 'role' ? 'Almost there!' : 'Signing you in…'}
      subtitle={state === 'role' ? 'One question and you are in.' : 'This only takes a second.'}
    >
      {state === 'working' && (
        <div className="py-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-5 font-display text-xl font-extrabold text-brand-900">Signing you in…</p>
          <p className="mt-1 font-body font-bold text-brand-500">Hang tight, we&apos;re setting things up.</p>
        </div>
      )}

      {state === 'role' && <RolePicker onDone={finish} />}

      {state === 'error' && (
        <div className="py-8 text-center animate-slide-up">
          <div className="text-5xl">😕</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-900">That sign-in didn&apos;t finish</h1>
          <p className="mt-1 font-body font-bold text-brand-500">
            The link may have expired. Try again — it usually works the second time.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/join')}>
            Back to sign in
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
