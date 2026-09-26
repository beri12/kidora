import { ROLE_HOME } from '@/constants';
import type { Role } from '@/types';

/** Every auth screen's URL, in one place. */
export const AUTH = {
  login: '/auth/login',
  signup: '/auth/signup',
  role: '/auth/signup/role',
  profile: '/auth/signup/profile',
  complete: '/auth/signup/complete',
  forgot: '/auth/forgot-password',
  reset: '/auth/reset-password',
  pending: '/pending',
} as const;

/**
 * Only same-site paths are followed after sign-in. "//evil.com" and
 * "https://…" would turn ?next= into an open redirect.
 */
export function safeNext(next?: string | null): string | null {
  if (!next || typeof next !== 'string') return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (next.startsWith('/auth/') && !next.startsWith('/auth/callback')) return null; // never loop back into auth
  return next;
}

/** Builds an auth URL carrying ?next= (and any extra params) along. */
export function authHref(path: string, params: Record<string, string | null | undefined> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Where a signed-in person goes next: the role question, or where they were headed, or home. */
export function destinationFor(role: Role, needsRole: boolean, next?: string | null, roleHint?: string | null) {
  if (needsRole) return authHref(AUTH.role, { next: safeNext(next), role: roleHint });
  return safeNext(next) ?? ROLE_HOME[role] ?? '/';
}

/**
 * The email typed on one screen, carried to the next (log in → forgot →
 * reset) in sessionStorage rather than the URL, so it never lands in
 * browser history or server logs.
 */
const RESET_KEY = 'kidora.reset-email';
export function rememberResetEmail(email: string) {
  try { if (email) sessionStorage.setItem(RESET_KEY, email); else sessionStorage.removeItem(RESET_KEY); } catch { /* storage off */ }
}
export function recallResetEmail(): string {
  try { return sessionStorage.getItem(RESET_KEY) ?? ''; } catch { return ''; }
}
