import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS } from '@/constants/storage-keys';
import type { AuthTokens, SessionMeta } from '@/types';

/**
 * Token vault. Tokens only ever live in the Keychain / Android Keystore via
 * SecureStore — never AsyncStorage, never logs. `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
 * keeps them out of iCloud/device backups.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// In-memory mirror so every request doesn't hit the keychain.
let cache: AuthTokens | null = null;
let loaded = false;

export const tokenStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    if (loaded) return cache;
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.accessToken, OPTIONS),
      SecureStore.getItemAsync(SECURE_KEYS.refreshToken, OPTIONS),
    ]);
    cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    loaded = true;
    return cache;
  },

  async getAccessToken(): Promise<string | null> {
    return (await this.getTokens())?.accessToken ?? null;
  },

  async getRefreshToken(): Promise<string | null> {
    return (await this.getTokens())?.refreshToken ?? null;
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.accessToken, tokens.accessToken, OPTIONS),
      SecureStore.setItemAsync(SECURE_KEYS.refreshToken, tokens.refreshToken, OPTIONS),
    ]);
    cache = tokens;
    loaded = true;
  },

  async getSessionMeta(): Promise<SessionMeta | null> {
    const raw = await SecureStore.getItemAsync(SECURE_KEYS.sessionMeta, OPTIONS);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionMeta;
    } catch {
      return null;
    }
  },

  async setSessionMeta(meta: SessionMeta): Promise<void> {
    await SecureStore.setItemAsync(SECURE_KEYS.sessionMeta, JSON.stringify(meta), OPTIONS);
  },

  async clear(): Promise<void> {
    cache = null;
    loaded = true;
    await Promise.all(
      Object.values(SECURE_KEYS).map((k) => SecureStore.deleteItemAsync(k, OPTIONS).catch(() => undefined)),
    );
  },

  /** Test hook. */
  resetMemory(): void {
    cache = null;
    loaded = false;
  },
};
