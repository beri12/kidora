'use client';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';
import type { Role } from '@/types';

/**
 * The "For Teachers / Families / Schools / Districts" links.
 *
 * - Signed out: go to sign-up with that role pre-selected. After the account
 *   is created (and, for schools and districts, verified) the join flow lands
 *   the user on their own dashboard.
 * - Signed in with a matching role: go straight to that dashboard.
 * - Signed in as someone else: show the public page for that audience.
 */
export type Audience = 'Teachers' | 'Families' | 'Schools' | 'Districts';

const AUDIENCES: Record<Audience, { signupRole: string; roles: Role[]; page: string }> = {
  Teachers: { signupRole: 'TEACHER', roles: ['TEACHER'], page: '/for-teachers' },
  Families: { signupRole: 'PARENT', roles: ['PARENT'], page: '/for-families' },
  Schools: { signupRole: 'SCHOOL', roles: ['SCHOOL_ADMIN', 'SCHOOL_LEADER'], page: '/pricing' },
  Districts: { signupRole: 'DISTRICT', roles: ['DISTRICT_ADMIN'], page: '/pricing' },
};

export const AUDIENCE_NAMES = Object.keys(AUDIENCES) as Audience[];

export function isAudience(label: string): label is Audience {
  return label in AUDIENCES;
}

export function useAudienceHref(): (a: Audience) => string {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = hydrated && user && accessToken ? user.role : null;

  return (a) => {
    const cfg = AUDIENCES[a];
    if (!role) return `/auth/signup?role=${cfg.signupRole}`;
    if (cfg.roles.includes(role)) return ROLE_HOME[role] ?? '/';
    return cfg.page;
  };
}
