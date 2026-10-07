import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { ROLE_HOME } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

/**
 * Defence-in-depth guard for a role group's layout. The root Stack already
 * protects groups; this catches deep links and stale navigation state.
 * (The backend's RolesGuard is the real authority — this is the UI half.)
 */
export function RoleGate({ role, children }: PropsWithChildren<{ role: UserRole }>) {
  const status = useAuthStore((s) => s.status);
  const userRole = useAuthStore((s) => s.user?.role);
  if (status !== 'authenticated') return <Redirect href="/(auth)/welcome" />;
  if (userRole !== role) return <Redirect href={(userRole ? ROLE_HOME[userRole] : '/(auth)/welcome') as never} />;
  return <>{children}</>;
}
