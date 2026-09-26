'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { AUTH, authHref } from './routes';

/**
 * The onboarding steps belong to a signed-in account that has not finished
 * choosing its role. Signed out → log in; already set up → its dashboard.
 * Returns the user once that is settled, null while redirecting.
 */
export function useSignupAccount(here: string) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace(authHref(AUTH.login, { next: here }));
    else if (user.roleConfirmed !== false) router.replace(ROLE_HOME[user.role] ?? '/');
  }, [hydrated, user, router, here]);

  return hydrated && user && user.roleConfirmed === false ? user : null;
}
