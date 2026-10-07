import { env } from '@/config/env';
import { toBackendSignupRole, toUserRole } from '@/lib/roles';
import { tokenStorage } from '@/lib/secure-storage';
import type { AuthSessionResponse, AuthTokens, BackendUser, User, UserRole } from '@/types';

import { api, refreshAccessToken } from './api';

export interface LoginInput {
  /** email address or E.164 phone number */
  identifier: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  gradeLevel?: string;
  schoolCode?: string;
  schoolName?: string;
  districtName?: string;
}

export type OAuthProvider = 'google' | 'facebook' | 'tiktok' | 'apple' | 'microsoft' | 'github';

export class UnsupportedRoleError extends Error {
  constructor() {
    super('unsupported_role');
    this.name = 'UnsupportedRoleError';
  }
}

/** Normalise GET /auth/me into the app's User. */
export function toUser(raw: BackendUser): User {
  const role = toUserRole(raw.role);
  if (!role) throw new UnsupportedRoleError();
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName ?? undefined,
    email: raw.email ?? undefined,
    role,
    backendRole: raw.role,
    avatarUrl: raw.avatarUrl ?? undefined,
    avatarColor: raw.avatarColor ?? undefined,
    schoolId: raw.schoolId ?? undefined,
    districtId: raw.districtId ?? undefined,
    school: raw.school ?? undefined,
    district: raw.district ?? undefined,
    pendingApproval: raw.orgRequest?.status === 'PENDING' || raw.orgRequest?.status === 'CHANGES_REQUESTED',
  };
}

function isEmail(v: string): boolean {
  return v.includes('@');
}

async function persist(session: AuthTokens): Promise<void> {
  await tokenStorage.setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
}

/**
 * AuthService — every call that touches credentials. Passwords and OTP codes
 * are passed straight to the backend over HTTPS and never stored or logged.
 */
export const authService = {
  async login(input: LoginInput): Promise<User> {
    const id = input.identifier.trim();
    const body = isEmail(id)
      ? { email: id.toLowerCase(), password: input.password, mfaCode: input.mfaCode }
      : { phone: id, password: input.password, mfaCode: input.mfaCode };
    const session = await api.post<AuthSessionResponse>('/auth/login', body);
    await persist(session);
    // Role is always taken from /auth/me, the server's current view.
    return this.getCurrentUser();
  },

  async register(input: RegisterInput): Promise<User> {
    const session = await api.post<AuthSessionResponse>('/auth/register', {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: toBackendSignupRole(input.role),
      phone: input.phone || undefined,
      gradeLevel: input.gradeLevel || undefined,
      schoolCode: input.schoolCode || undefined,
      schoolName: input.schoolName || undefined,
      districtName: input.districtName || undefined,
    });
    await persist(session);
    return this.getCurrentUser();
  },

  /** SMS sign-in step 1. Always resolves `{ sent: true }` (no account enumeration). */
  requestOtp(phone: string): Promise<{ sent: boolean }> {
    return api.post('/auth/otp/request', { phone: phone.trim() });
  },

  /** SMS sign-in step 2. */
  async verifyOtp(phone: string, code: string): Promise<User> {
    const session = await api.post<AuthSessionResponse>('/auth/otp/verify', { phone: phone.trim(), code });
    await persist(session);
    return this.getCurrentUser();
  },

  /** API GAP: see docs/API-GAPS.md (#1). */
  requestPasswordReset(email: string): Promise<{ ok: boolean }> {
    return api.post('/auth/password/forgot', { email: email.trim().toLowerCase() });
  },

  /** API GAP: see docs/API-GAPS.md (#1). */
  resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
    return api.post('/auth/password/reset', { token, password });
  },

  refreshToken(): Promise<string | null> {
    return refreshAccessToken();
  },

  async getCurrentUser(): Promise<User> {
    const raw = await api.get<BackendUser>('/auth/me');
    return toUser(raw);
  },

  /** Rehydrate on app start. Returns null when there is no usable session. */
  async restoreSession(): Promise<User | null> {
    const tokens = await tokenStorage.getTokens();
    if (!tokens) return null;
    // A 401 here is handled by the API client (refresh → replay, or wipe).
    return this.getCurrentUser();
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logging out must succeed locally even when offline.
    } finally {
      await tokenStorage.clear();
    }
  },

  /** Providers configured on this deployment (GET /auth/providers). */
  async providers(): Promise<OAuthProvider[]> {
    const res = await api.get<{ providers: OAuthProvider[] }>('/auth/providers');
    return res.providers;
  },

  /**
   * URL that starts a provider's OAuth flow. `redirect_uri` asks the backend
   * to send tokens back to the app's scheme — API GAP #2: today the backend
   * always redirects to the web app, so mobile social login needs that change.
   */
  oauthStartUrl(provider: OAuthProvider, redirectUri: string): string {
    return `${env.apiUrl}/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  /** Store the token pair handed back by the OAuth redirect fragment. */
  async completeOAuth(tokens: AuthTokens): Promise<User> {
    await persist(tokens);
    return this.getCurrentUser();
  },
};

/** Parse `#accessToken=..&refreshToken=..` from an OAuth callback URL. */
export function parseOAuthCallback(url: string): AuthTokens | null {
  const hash = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params = new URLSearchParams(hash);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}
