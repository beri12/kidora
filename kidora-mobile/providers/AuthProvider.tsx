import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';

import { analytics } from '@/features/analytics/track';
import { unregisterPush } from '@/features/notifications/push';
import { isApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { toBackendSignupRole } from '@/lib/roles';
import { tokenStorage } from '@/lib/secure-storage';
import { setAuthFailureHandler } from '@/services/api';
import {
  authService,
  parseOAuthCallback,
  UnsupportedRoleError,
  type LoginInput,
  type OAuthProvider,
  type RegisterInput,
} from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useOfflineStore } from '@/store/offlineStore';
import { useUserStore } from '@/store/userStore';
import type { User } from '@/types';

interface AuthContextValue {
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  loginWithProvider: (provider: OAuthProvider) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

WebBrowser.maybeCompleteAuthSession();

export function AuthProvider({ children }: PropsWithChildren) {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const clearAuth = useAuthStore((s) => s.clear);

  /** Wipe every trace of the session from memory and disk. */
  const wipeSession = useCallback(async () => {
    await tokenStorage.clear();
    clearAuth();
    useGameStore.getState().reset();
    useUserStore.getState().reset();
    // Unsynced progress belongs to the previous user — never replay it under another account.
    useOfflineStore.getState().clear();
    qc.clear();
  }, [clearAuth, qc]);

  const adopt = useCallback(
    async (user: User) => {
      await tokenStorage.setSessionMeta({ userId: user.id, role: user.role, createdAt: Date.now() });
      setUser(user);
      analytics.track('app_opened', { role: user.role, source: 'sign_in' });
      return user;
    },
    [setUser],
  );

  const handleAuthError = useCallback(
    async (e: unknown): Promise<never> => {
      if (e instanceof UnsupportedRoleError) {
        await tokenStorage.clear();
        setStatus('unsupported');
      }
      throw e;
    },
    [setStatus],
  );

  // Session restoration on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await authService.restoreSession();
        if (cancelled) return;
        if (user) {
          setUser(user);
          analytics.track('app_opened', { role: user.role, source: 'restore' });
        } else {
          setStatus('unauthenticated');
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof UnsupportedRoleError) {
          await tokenStorage.clear();
          setStatus('unsupported');
          return;
        }
        // Offline launch with a stored session: trust the cached principal so
        // students can keep learning; the server re-validates on reconnect.
        const meta = await tokenStorage.getSessionMeta();
        if (isApiError(e) && e.retryable && meta) {
          setUser({ id: meta.userId, name: '', role: meta.role, backendRole: toBackendSignupRole(meta.role), pendingApproval: false });
          return;
        }
        logger.warn('session restore failed', { kind: isApiError(e) ? e.kind : 'unknown' });
        await wipeSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setStatus, setUser, wipeSession]);

  // Refresh failure anywhere → clean slate → login.
  useEffect(() => {
    setAuthFailureHandler(() => {
      void wipeSession().then(() => router.replace('/(auth)/login'));
    });
    return () => setAuthFailureHandler(null);
  }, [wipeSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      login: (input) => authService.login(input).then(adopt, handleAuthError),
      register: (input) => authService.register(input).then(adopt, handleAuthError),
      requestOtp: async (phone) => {
        await authService.requestOtp(phone);
      },
      verifyOtp: (phone, code) => authService.verifyOtp(phone, code).then(adopt, handleAuthError),
      loginWithProvider: async (provider) => {
        const redirectUri = Linking.createURL('oauth');
        const result = await WebBrowser.openAuthSessionAsync(authService.oauthStartUrl(provider, redirectUri), redirectUri);
        if (result.type !== 'success') return null;
        const tokens = parseOAuthCallback(result.url);
        if (!tokens) return null;
        return authService.completeOAuth(tokens).then(adopt, handleAuthError);
      },
      logout: async () => {
        await unregisterPush();
        await authService.logout();
        await wipeSession();
        router.replace('/(auth)/welcome');
      },
      refreshUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          setUser(user);
          return user;
        } catch {
          return null;
        }
      },
    }),
    [adopt, handleAuthError, setUser, wipeSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
