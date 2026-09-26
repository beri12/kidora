'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { gsap } from 'gsap';
import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { Stepper } from '@/components/auth/kidora/ui';
import { KidHero, RobotBuddy } from '@/components/auth/kidora/illustrations';
import { ROLE_HOME } from '@/constants';
import { AUTH, authHref, safeNext } from '@/features/auth/routes';
import { celebrate, useGsap } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';

const COPY: Record<string, { title: string; body: string; cta: string }> = {
  CHILD: { title: "You're all set! 🎉", body: 'Your learning adventure starts now. Play games, join courses and earn badges.', cta: 'Start learning' },
  PARENT: { title: 'Welcome to Kidora! 🎉', body: "Add your child and follow their progress — you'll see every lesson, badge and streak.", cta: 'Go to my dashboard' },
  TEACHER: { title: 'Welcome, teacher! 🎉', body: 'Create your first course and share its code with your class.', cta: 'Go to my dashboard' },
};

function CompleteScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace(AUTH.login);
    else if (user.roleConfirmed === false) router.replace(authHref(AUTH.role, { next }));
    else void celebrate(0);
  }, [hydrated, user, router, next]);

  useGsap(() => {
    gsap.from('[data-done="art"]', { scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(1.7)' });
    gsap.to('[data-done="robot"]', { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }, root, [user?.id]);

  if (!user || user.roleConfirmed === false) return null;
  const copy = COPY[user.role] ?? { title: 'Welcome to Kidora! 🎉', body: 'Your account is ready.', cta: 'Go to my dashboard' };
  const home = next ?? ROLE_HOME[user.role] ?? '/';
  const requestedSchool = user.requestedSchoolId;

  return (
    <CenteredAuthLayout logo={false}>
      <div ref={root}>
        <Stepper current={2} />
        <div data-done="art" className="relative mx-auto mt-8 h-40 w-56" aria-hidden>
          <div className="absolute inset-x-4 bottom-0 top-6 rounded-[48px] bg-gradient-to-br from-sky-200 via-iris-100 to-amber-100" />
          <KidHero className="absolute bottom-0 left-6 h-44 w-auto" />
          <div data-done="robot" className="absolute right-2 top-2 w-16"><RobotBuddy className="w-full" /></div>
        </div>
        <h1 data-anim="row" className="mt-6 text-center font-display text-3xl font-extrabold text-ink">{copy.title}</h1>
        <p data-anim="row" className="mx-auto mt-2 max-w-sm text-center font-body font-semibold text-slate-600">{copy.body}</p>
        {requestedSchool && (
          <p data-anim="row" className="mx-auto mt-4 max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-center font-body text-sm font-bold text-amber-800">
            We&apos;ve asked your school to add you. You can start learning right away — school courses appear once they approve.
          </p>
        )}
        <div className="mx-auto mt-7 max-w-sm space-y-3">
          <Link href={home} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-iris-600 font-body text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(91,60,240,.7)] hover:bg-iris-700">
            {copy.cta}
          </Link>
          {user.role === 'CHILD' && (
            <Link href="/student/dashboard#course-code" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 font-body text-base font-extrabold text-iris-700 hover:bg-iris-50">
              I have a course code
            </Link>
          )}
        </div>
      </div>
    </CenteredAuthLayout>
  );
}

export default function CompletePage() {
  return <Suspense fallback={null}><CompleteScreen /></Suspense>;
}
