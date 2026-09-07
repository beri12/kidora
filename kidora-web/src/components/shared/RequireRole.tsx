'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';
import type { Role } from '@/types';

/**
 * Second line of route protection, inside the app shell.
 *
 * Middleware runs before this and only sees a client-set cookie. This checks
 * the real session in the auth store, so a forged cookie still cannot render a
 * dashboard. Neither is the security boundary: the backend refuses the data
 * either way. What this adds is that the user is moved somewhere useful rather
 * than left looking at an empty shell full of 403s.
 */
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const signedIn = Boolean(user && accessToken);
  const permitted = signedIn && allow.includes(user!.role);

  useEffect(() => {
    // Wait for the persisted store to load, or the first paint after a reload
    // would bounce a perfectly valid session to /login.
    if (!hydrated) return;

    if (!signedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!permitted) {
      router.replace(ROLE_HOME[user!.role] ?? '/');
    }
  }, [hydrated, signedIn, permitted, user, pathname, router]);

  // Render nothing until we know: showing the shell first would flash another
  // role's navigation before the redirect lands.
  if (!hydrated || !permitted) return null;
  return <>{children}</>;
}
