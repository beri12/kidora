'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AuthShell } from '@/components/auth/AuthShell';
import { ROLE_HOME } from '@/constants';
import { paymentsApi } from '@/lib/api/payments';
import { ApiError } from '@/lib/api/client';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';

type State = 'checking' | 'paid' | 'pending' | 'failed' | 'signin';

/** Up to ~20 s: Chapa can take a few seconds to mark a mobile-money payment done. */
const ATTEMPTS = 8;
const GAP_MS = 2500;

/**
 * Where the buyer lands after paying. The page never decides the outcome:
 * it asks the API, which asks the provider, and shows what comes back.
 */
function PaymentReturn() {
  const params = useSearchParams();
  const provider = params.get('provider');
  const txRef = params.get('tx_ref') ?? params.get('trx_ref');
  const { user, hydrated } = useAuthStore();
  const [state, setState] = useState<State>(provider === 'chapa' ? 'checking' : params.get('status') === 'paid' ? 'paid' : 'failed');

  useEffect(() => {
    if (provider !== 'chapa' || !hydrated) return;
    if (!user) { setState('signin'); return; }
    if (!txRef) { setState('failed'); return; }

    let cancelled = false;
    (async () => {
      for (let i = 0; i < ATTEMPTS && !cancelled; i++) {
        try {
          const r = await paymentsApi.chapaVerify(txRef);
          if (r.status === 'paid') { setState('paid'); void celebrate(0); return; }
          if (r.status === 'failed') { setState('failed'); return; }
        } catch (e) {
          // An unknown or foreign reference is a verdict; a network blip is not.
          if (e instanceof ApiError && (e.status === 400 || e.status === 404)) { setState('failed'); return; }
        }
        await new Promise((res) => setTimeout(res, GAP_MS));
      }
      if (!cancelled) setState('pending');
    })();
    return () => { cancelled = true; };
  }, [provider, txRef, hydrated, user]);

  const home = user ? ROLE_HOME[user.role] ?? '/' : '/';
  const copy: Record<State, { title: string; emoji: string; heading: string; body: string }> = {
    checking: { title: 'One moment… ✨', emoji: '⏳', heading: 'Confirming your payment', body: 'We are checking with Chapa. This takes a few seconds.' },
    paid: { title: 'Hooray! 🎉', emoji: '🎉', heading: 'Your plan is active', body: 'Premium courses and games are unlocked. Happy learning!' },
    pending: { title: 'Almost there! ⏳', emoji: '🕒', heading: 'Still confirming', body: 'Your payment is being processed. Your plan turns on automatically when it completes — you can close this page.' },
    failed: { title: 'Oops! 🙈', emoji: '😕', heading: 'The payment did not complete', body: 'You have not been charged for the plan. You can try again from the pricing page.' },
    signin: { title: 'Welcome back! 👋', emoji: '🔐', heading: 'Sign in to finish', body: 'Sign in with the account you paid from, and we will confirm your payment.' },
  };
  const c = copy[state];

  return (
    <AuthShell title={c.title}>
      <div className="py-2 text-center" role="status" aria-live="polite">
        {state === 'checking' ? (
          <motion.div
            className="mx-auto h-14 w-14 rounded-full border-4 border-brand-100 border-t-brand-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <div className="text-5xl" aria-hidden>{c.emoji}</div>
        )}
        <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-900">{c.heading}</h1>
        <p className="mt-1 font-body font-bold text-brand-500">{c.body}</p>

        <div className="mt-6 space-y-3">
          {state === 'paid' && <Link href={home} className="flex min-h-14 items-center justify-center rounded-2xl bg-grass-600 font-display text-lg font-extrabold text-white">Start learning →</Link>}
          {state === 'failed' && <Link href="/pricing" className="flex min-h-14 items-center justify-center rounded-2xl bg-brand-700 font-display text-lg font-extrabold text-white">Back to pricing</Link>}
          {state === 'pending' && <Link href={home} className="flex min-h-14 items-center justify-center rounded-2xl bg-brand-700 font-display text-lg font-extrabold text-white">Go to my dashboard</Link>}
          {state === 'signin' && (
            <Link href={`/auth/login?next=${encodeURIComponent(`/payment/return?provider=chapa&tx_ref=${txRef ?? ''}`)}`} className="flex min-h-14 items-center justify-center rounded-2xl bg-brand-700 font-display text-lg font-extrabold text-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
