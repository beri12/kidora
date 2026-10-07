import { create } from 'zustand';

import type { User } from '@/types';

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated' | 'unsupported';

interface AuthState {
  status: AuthStatus;
  /** The signed-in principal (identity + role). Profile data stays in TanStack Query. */
  user: User | null;
  setUser: (user: User) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

/** Not persisted: tokens live in SecureStore and the user is re-read from /auth/me on launch. */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  user: null,
  setUser: (user) => set({ user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));

export const selectRole = (s: AuthState) => s.user?.role ?? null;
