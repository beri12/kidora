import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AxiosInstance } from 'axios';
import { api, API_URL } from '@/lib/axios';
import type { AuthResponse, User } from '@/types';

/** Everything POST /auth/register accepts beyond name/email/password. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  gradeLevel?: string;
  schoolCode?: string;
  subject?: string;
  schoolName?: string;
  country?: string;
  districtName?: string;
  region?: string;
}

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

      login: async (email, password) => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        get().setSession(data);
        return data.user;
      },

      // Same endpoint; the backend looks the account up by whichever
      // identifier is present.
      loginWithPhone: async (phone, password) => {
        const { data } = await api.post<AuthResponse>('/auth/login', { phone, password });
        get().setSession(data);
        return data.user;
      },

      // Blank optional fields are dropped rather than sent as "", which the
      // API's string validators would reject.
      register: async (payload) => {
        const body = Object.fromEntries(
          Object.entries(payload).filter(([, v]) => v !== undefined && String(v).trim() !== ''),
        );
        const { data } = await api.post<AuthResponse>('/auth/register', body);
        get().setSession(data);
        return data.user;
      },

      // Step 1 of SMS sign-in. Always resolves for a well-formed number, even
      // if no account uses it — the API deliberately doesn't say either way.
      requestOtp: async (phone) => {
        const { data } = await api.post<{ sent: boolean; expiresIn: number; devCode?: string }>(
          '/auth/otp/request',
          { phone },
        );
        return data;
      },

      // Step 2 of SMS sign-in; returns the same session shape as /auth/login.
      verifyOtp: async (phone, code) => {
        const { data } = await api.post<AuthResponse>('/auth/otp/verify', { phone, code });
        get().setSession(data);
        return data.user;
      },

      // The response interceptor passes its own non-intercepted axios instance
      // so a 401 on the refresh call can't re-enter this same handler. Falls
      // back to fetch when called directly (e.g. from a component).
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
          if (!accessToken) throw new Error('refresh returned no access token');
          set({ accessToken, refreshToken });
          return accessToken as string;
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
