import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AxiosInstance } from 'axios';
import { api, API_URL } from '@/lib/axios';
import type { AuthResponse, User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (r: AuthResponse) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string) => Promise<User>;
  /** `client` lets the axios interceptor pass its non-intercepted instance. */
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

      register: async (name, email, password, role = 'PARENT') => {
        const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password, role });
        get().setSession(data);
        return data.user;
      },

      // Uses the caller's non-intercepted axios instance when given one, and
      // raw fetch otherwise, so the interceptor can never recurse on a 401.
      refresh: async (client?: AxiosInstance) => {
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