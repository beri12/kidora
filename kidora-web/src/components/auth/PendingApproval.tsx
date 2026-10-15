'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { OrgRequest } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  SCHOOL_ADMIN: 'School Leader',
  SCHOOL_LEADER: 'School Leader',
  DISTRICT_ADMIN: 'District Leader',
};

/** Where the request sits, as the four steps of the flow. */
const STEPS = ['Submitted', 'In review', 'Approved', 'Access on'] as const;

function stepIndex(status: OrgRequest['status']): number {
  if (status === 'APPROVED') return 3;
  if (status === 'REJECTED') return 1;
  if (status === 'CHANGES_REQUESTED') return 1;
  return 1; // PENDING — submitted and being looked at
}

/**
 * What an applicant sees between asking for administrative access and getting
 * it. Polls quietly rather than making them reload: an approval that lands
 * while the tab is open should just open the door.
 */
export function PendingApproval({ initial }: { initial?: OrgRequest | null }) {
  const router = useRouter();
  const { orgRequest, refresh, user } = useAuthStore();

  const [request, setRequest] = useState<OrgRequest | null>(initial ?? null);
  const [checking, setChecking] = useState(!initial);

  // On approval the role changed in the database, so the stored token is
  // stale. Refreshing swaps it for one carrying the new role before routing.
  const enter = useCallback(async () => {
    await refresh();
    const me = await useAuthStore.getState().setTokens(
      useAuthStore.getState().accessToken ?? '',
      useAuthStore.getState().refreshToken ?? '',
    );
    router.replace(ROLE_HOME[me?.role ?? 'PARENT'] ?? '/');
  }, [refresh, router]);

  const check = useCallback(async () => {
    try {
      const next = await orgRequest();
      setRequest(next);
      if (next?.status === 'APPROVED') await enter();
    } catch {
      // Offline or a blip: the next tick tries again.
    } finally {
      setChecking(false);
    }
  }, [orgRequest, enter]);

  useEffect(() => {
    void check();
    // A review is a human action taking hours, so half a minute is plenty —
    // often enough to feel live, rare enough to cost nothing.
    const id = setInterval(check, 30_000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  if (checking && !request) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="animate-slide-up py-8 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-900">No request found</h1>
        <p className="mt-1 font-body font-bold text-brand-500">
          You have not applied for school or district access on this account.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/auth/signup')}>
          Choose how you use Kidora
        </Button>
      </div>
    );
  }

  const label = ROLE_LABEL[request.requestedRole] ?? 'Administrator';

  if (request.status === 'REJECTED') {
    return (
      <div className="animate-slide-up">
        <div className="text-5xl">😕</div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-900">
          We couldn&apos;t verify this one
        </h1>
        <p className="mt-2 font-body font-bold text-brand-500">
          {request.decisionNote || `We could not confirm your role at ${request.organizationName}.`}
        </p>
        <p className="mt-4 font-body-x text-[13px] leading-relaxed text-brand-500">
          If that looks wrong, reply to the email we sent, or ask a colleague who already
          administers {request.organizationName} for an organisation code — a code gets you in
          straight away.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/auth/signup?role=SCHOOL_LEADER')}>
          Try again with a code
        </Button>
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="mt-3 w-full font-body font-extrabold text-brand-500 transition hover:text-brand-700"
        >
          Use Kidora as a parent for now
        </button>
      </div>
    );
  }

  const needsMore = request.status === 'CHANGES_REQUESTED';
  const active = stepIndex(request.status);

  return (
    <div className="animate-slide-up">
      {/* The waiting animation: three dots orbiting a clock. */}
      <div className="flex justify-center">
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-800 text-4xl shadow-btn animate-halo">
          <span className="animate-bob">{needsMore ? '📄' : '⏳'}</span>
        </div>
      </div>

      <h1 className="mt-5 text-center font-display text-2xl font-extrabold text-brand-900">
        {needsMore ? 'We need a little more' : "You're in the queue"}
      </h1>
      <p className="mt-1 text-center font-body font-bold text-brand-500">
        {needsMore
          ? request.decisionNote
          : `We're checking that you lead ${request.organizationName}.`}
      </p>

      {/* Progress rail */}
      <ol className="mt-7 space-y-0">
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-display text-[13px] font-extrabold transition-all duration-300 ' +
                    (done
                      ? 'border-grass-600 bg-grass-600 text-white'
                      : current
                        ? 'animate-pop border-brand-600 bg-white text-brand-700'
                        : 'border-brand-200 bg-white text-brand-300')
                  }
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  {done ? '✓' : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={'w-0.5 flex-1 ' + (done ? 'bg-grass-600' : 'bg-brand-100')} style={{ minHeight: 22 }} />
                )}
              </div>
              <div className="pb-4">
                <p
                  className={
                    'font-display font-extrabold ' +
                    (done || current ? 'text-brand-900' : 'text-brand-300')
                  }
                >
                  {step}
                </p>
                {current && !needsMore && (
                  <p className="font-body-x text-[12px] text-brand-500">
                    Usually within two working days
                  </p>
                )}
                {i === 3 && (
                  <p className="font-body-x text-[12px] text-brand-400">
                    Your {label.toLowerCase()} dashboard unlocks here
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
        <p className="font-body-x text-[13px] leading-relaxed text-brand-600">
          <b className="text-brand-800">Applied as:</b> {label} at {request.organizationName}
          <br />
          You can close this page — we&apos;ll {user?.email ? 'email' : 'text'} you as soon as it
          is decided.
        </p>
      </div>

      <Button size="lg" className="mt-5 w-full" onClick={check} disabled={checking}>
        {checking ? 'Checking…' : 'Check again'}
      </Button>

      <button
        type="button"
        onClick={() => router.replace('/')}
        className="mt-3 w-full font-body font-extrabold text-brand-500 transition hover:text-brand-700"
      >
        Browse Kidora meanwhile
      </button>
    </div>
  );
}
