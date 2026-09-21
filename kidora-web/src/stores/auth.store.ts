import type { AxiosInstance } from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, API_URL } from '@/lib/axios';
import type { AuthResponse, PhoneStartResponse, PhoneVerifyResponse, SignupRoleKey, User } from '@/types';

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
  /** Answers "How will you use Kidora?" for a brand-new account. */
  selectRole: (role: SignupRoleKey, extra?: Record<string, string>) => Promise<User>;
  /**
   * Swaps the refresh token for a new pair. The axios interceptor passes its
   * own non-intercepted client so a 401 on the refresh call can't recurse.
   */
  refresh: (client?: AxiosInstance) => Promise<string | null>;
  logout: () => void;
  hasPlan: () => boolean;
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
        const { data } = await api.post<AuthResponse>('/auth/role', { role, ...(extra ?? {}) });
        get().setSession(data);
        return data.user;
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
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true; },
    },
  ),
);