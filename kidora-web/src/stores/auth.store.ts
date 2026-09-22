import type { AxiosInstance } from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, API_URL } from '@/lib/axios';
import type {
  AuthResponse,
  OrgRequest,
  PhoneStartResponse,
  PhoneVerifyResponse,
  Role,
  SignupRoleKey,
  SubmitOrgRequestResponse,
  User,
} from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (r: AuthResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<User | null>;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string) => Promise<User>;
  /** Texts a one-time code to `phone` (E.164). */
  startPhone: (phone: string) => Promise<PhoneStartResponse>;
  /** Verifies the code, signing in or creating the account. */
  verifyPhone: (phone: string, code: string, name?: string) => Promise<PhoneVerifyResponse>;
  /**
   * Answers "How will you use Kidora?".
   *
   * School and district roles are not granted here: the API replies with
   * `needsVerification`, the account keeps its current role, and the caller
   * goes on to the verification form.
   */
  selectRole: (
    role: SignupRoleKey,
    extra?: Record<string, string>,
  ) => Promise<{ user: User; needsVerification: boolean }>;
  /** Submits the school / district claim (or redeems an organisation code). */
  submitOrgRequest: (body: Record<string, unknown>) => Promise<SubmitOrgRequestResponse>;
  /** Current status, for the "pending approval" screen. */
  orgRequest: () => Promise<OrgRequest | null>;
  /**
   * Swaps the refresh token for a new pair. The axios interceptor passes its
   * own non-intercepted client so a 401 on the refresh call can't recurse.
   */
  refresh: (client?: AxiosInstance) => Promise<string | null>;
  logout: () => void;
  hasPlan: () => boolean;
}

/**
 * Mirror the signed-in role into a cookie for src/middleware.ts.
 *
 * The middleware runs on the edge, before any React code, so it cannot read
 * this store — localStorage is not sent with a navigation request. Without
 * this the cookie was never written by anything, so `role` was always
 * undefined there and every protected route bounced a perfectly valid
 * session to /login.
 *
 * It is deliberately not httpOnly (client JavaScript has to write it) and is
 * therefore forgeable. That is fine: the middleware only decides which shell
 * to render. Every request the page then makes is authorised for real by the
 * API's JwtAuthGuard + RolesGuard against the bearer token.
 */
const ROLE_COOKIE = 'kidora_role';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, same order as the refresh token

function syncRoleCookie(role: Role | null | undefined) {
  if (typeof document === 'undefined') return; // SSR / tests
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = role
    ? `${ROLE_COOKIE}=${role}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
    : `${ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
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

        set({ user: r.user, accessToken, refreshToken });
      },

      // Used by the OAuth callback page, which receives the pair in the URL
      // fragment rather than from a JSON response. Loads the profile so the
      // rest of the app has a user to route on.
      setTokens: async (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        try {
          const { data } = await api.get<User>('/auth/me');
          set({ user: data });
          return data;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
          return null;
        }
      },

      login: async (email, password) => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        get().setSession(data);
        return data.user;
      },

      register: async (name, email, password, role = 'PARENT') => {
        const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password, role });
        get().setSession(data);
        return data.user;
      },

      startPhone: async (phone) => {
        const { data } = await api.post<PhoneStartResponse>('/auth/phone/start', { phone });
        return data;
      },

      verifyPhone: async (phone, code, name) => {
        const { data } = await api.post<PhoneVerifyResponse>('/auth/phone/verify', {
          phone,
          code,
          ...(name ? { name } : {}),
        });
        get().setSession(data);
        return data;
      },

      // The role lives in the JWT, so the API returns a fresh token pair here
      // and the session is replaced rather than patched.
      selectRole: async (role, extra) => {
        const { data } = await api.post<AuthResponse & { needsVerification?: boolean }>(
          '/auth/role',
          { role, ...(extra ?? {}) },
        );
        // A verification-gated role returns no tokens — there is no new role
        // to put in one yet — so the session is left exactly as it was.
        if (data.needsVerification) {
          set({ user: data.user });
          return { user: data.user, needsVerification: true };
        }
        get().setSession(data);
        return { user: data.user, needsVerification: false };
      },

      submitOrgRequest: async (body) => {
        const { data } = await api.post<SubmitOrgRequestResponse>('/org/requests', body);
        // An organisation code is approved on the spot, which changes the role
        // in the database. Refreshing swaps the stale token for one that
        // carries it, so the dashboard is reachable straight away.
        if (data.roleGranted) {
          await get().refresh();
          const me = await api.get<User>('/auth/me');
          set({ user: me.data });
        }
        return data;
      },

      orgRequest: async () => {
        const { data } = await api.get<OrgRequest | null>('/org/requests/me');
        return data;
      },

      // Never goes through the main axios instance: a 401 on the refresh call
      // would re-enter the interceptor that triggered it.
      refresh: async (client) => {
        const rt = get().refreshToken;
        if (!rt) return null;
        try {
          let data: any;
          if (client) {
            data = (await client.post('/auth/refresh', { refreshToken: rt })).data;
          } else {
            const res = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: rt }),
            });
            if (!res.ok) throw new Error('refresh failed');
            data = await res.json();
          }
          const accessToken = data.accessToken ?? data.access_token ?? null;
          const refreshToken = data.refreshToken ?? data.refresh_token ?? null;
          set({ accessToken, refreshToken });
          return accessToken as string | null;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
          return null;
        }
      },

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

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
        // A returning visitor has the session in localStorage but no cookie
        // (it may have expired, or been dropped). Put it back before the next
        // navigation asks the middleware about it.
        syncRoleCookie(state.user?.role ?? null);
      },
    },
  ),
);

// Every path that touches `user` — sign-in, role selection, an approved org
// request, refresh failure, logout — goes through the store, so subscribing
// once here is what keeps the cookie honest, rather than a call bolted onto
// each of them that the next one will forget.
useAuthStore.subscribe((s) => syncRoleCookie(s.user?.role ?? null));