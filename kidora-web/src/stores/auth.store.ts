import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type RegisterPayload } from '@/lib/api/auth';
import type { AuthResponse, User } from '@/types';

// Re-exported so existing imports from the store keep resolving; the type is
// defined next to the call that uses it, in lib/api/auth.
export type { RegisterPayload };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (r: AuthResponse) => void;
  login: (email: string, password: string) => Promise<User>;
  loginWithPhone: (phone: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  requestOtp: (phone: string) => Promise<{ sent: boolean; expiresIn: number; devCode?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  refresh: () => Promise<string | null>;
  logout: () => void;
  hasPlan: () => boolean;
}

/**
 * Mirrors the signed-in role into a cookie.
 *
 * The session itself lives in localStorage, which Next middleware cannot read.
 * This cookie lets middleware redirect before a protected page renders. It is
 * a navigation hint only — it is set by client JavaScript and a user can edit
 * it, so it is never trusted for authorization. Every protected read is
 * enforced again by the backend's JwtAuthGuard and RolesGuard.
 */
const ROLE_COOKIE = 'kidora_role';
function syncRoleCookie(role?: string | null) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = role
    ? `${ROLE_COOKIE}=${encodeURIComponent(role)}; Path=/; SameSite=Lax; Max-Age=604800${secure}`
    : `${ROLE_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

// Auth store — persisted to localStorage. The axios interceptor reads
// accessToken/refresh() from here, so keep it framework-agnostic.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,

      // Accepts either camelCase (accessToken/refreshToken) or snake_case
      // (access_token/refresh_token) from the backend response, so a mismatch
      // between the frontend type and the actual API shape can't silently
      // leave accessToken as undefined.
      setSession: (r: any) => {
        const accessToken = r.accessToken ?? r.access_token ?? null;
        const refreshToken = r.refreshToken ?? r.refresh_token ?? null;

        if (!accessToken) {
          // Loud in dev, so this never again shows up as a silent 401 chase.
          console.error('setSession: no access token found in response', r);
        }

        syncRoleCookie(r.user?.role);
        set({ user: r.user, accessToken, refreshToken });
      },

      login: async (email, password) => {
        const data = await authApi.login(email, password);
        get().setSession(data);
        return data.user;
      },

      loginWithPhone: async (phone, password) => {
        const data = await authApi.loginWithPhone(phone, password);
        get().setSession(data);
        return data.user;
      },

      register: async (payload) => {
        const data = await authApi.register(payload);
        get().setSession(data);
        return data.user;
      },

      // Step 1 of SMS sign-in. Always resolves for a well-formed number, even
      // if no account uses it — the API deliberately doesn't say either way.
      requestOtp: (phone) => authApi.requestOtp(phone),

      // Step 2 of SMS sign-in; returns the same session shape as /auth/login.
      verifyOtp: async (phone, code) => {
        const data = await authApi.verifyOtp(phone, code);
        get().setSession(data);
        return data.user;
      },

      // Called by both clients' 401 handlers. authApi.refresh uses raw fetch so
      // a 401 on the refresh call itself cannot re-enter an interceptor.
      refresh: async () => {
        const rt = get().refreshToken;
        if (!rt) return null;
        try {
          const data = await authApi.refresh(rt);
          const accessToken = data.accessToken ?? null;
          if (!accessToken) throw new Error('refresh returned no access token');
          set({ accessToken, refreshToken: data.refreshToken ?? rt });
          return accessToken;
        } catch {
          syncRoleCookie(null);
          set({ user: null, accessToken: null, refreshToken: null });
          return null;
        }
      },

      logout: () => {
        // Revoke the refresh token server-side; the local session is cleared
        // either way so a network failure cannot strand the user signed in.
        void authApi.logout();
        syncRoleCookie(null);
        set({ user: null, accessToken: null, refreshToken: null });
      },

      hasPlan: () => {
        const p = get().user?.subscriptionPlan;
        return p === 'family' || p === 'school';
      },
    }),
    {
      name: 'cl.auth',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        // Keep the cookie in step with the restored session: it expires on its
        // own schedule and would otherwise drift from localStorage.
        syncRoleCookie(state.accessToken ? state.user?.role : null);
      },
    },
  ),
);
