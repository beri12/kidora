import type { AuthTokens, SessionMeta } from '@/types';

/**
 * Web build (preview / QA only — Kidora ships on iOS and Android).
 * Tokens are kept in memory and never written to localStorage, so a page
 * script can't harvest them from storage; a reload signs the user out.
 */
let tokens: AuthTokens | null = null;
let meta: SessionMeta | null = null;

export const tokenStorage = {
  getTokens: async (): Promise<AuthTokens | null> => tokens,
  getAccessToken: async (): Promise<string | null> => tokens?.accessToken ?? null,
  getRefreshToken: async (): Promise<string | null> => tokens?.refreshToken ?? null,
  setTokens: async (next: AuthTokens): Promise<void> => {
    tokens = next;
  },
  getSessionMeta: async (): Promise<SessionMeta | null> => meta,
  setSessionMeta: async (next: SessionMeta): Promise<void> => {
    meta = next;
  },
  clear: async (): Promise<void> => {
    tokens = null;
    meta = null;
  },
  resetMemory: (): void => {
    tokens = null;
    meta = null;
  },
};
