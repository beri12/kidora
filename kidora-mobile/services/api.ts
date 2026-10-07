import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { ApiError, fromHttpResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { networkState } from '@/lib/network-state';
import { tokenStorage } from '@/lib/secure-storage';
import type { AuthTokens } from '@/types';

/**
 * The only HTTP client in the app. UI code never calls fetch/axios directly:
 * screens → hooks (TanStack Query) → services → this module.
 *
 * Responsibilities:
 *  - attach the bearer token from SecureStore
 *  - refresh an expired access token once, single-flight, then replay
 *  - on refresh failure: wipe tokens and notify the auth layer (→ login)
 *  - normalise every failure into an ApiError with no backend internals
 */

type AuthFailureHandler = () => void;
let onAuthFailure: AuthFailureHandler | null = null;

/** Registered by AuthProvider; keeps this module free of React/store imports. */
export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  onAuthFailure = handler;
}

/** Endpoints that must never trigger a refresh-and-retry loop. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/otp/', '/auth/logout'];

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API
export const http: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: env.requestTimeoutMs,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

http.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// ---- single-flight refresh -------------------------------------------------

let refreshing: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bare axios: must not pass through our own interceptors.
    const res = await axios.post<AuthTokens>(
      `${env.apiUrl}/auth/refresh`,
      { refreshToken },
      { timeout: env.requestTimeoutMs },
    );
    await tokenStorage.setTokens(res.data);
    return res.data.accessToken;
  } catch (e) {
    // A network blip is not a revoked session: keep tokens, let the caller fail.
    if (e instanceof AxiosError && !e.response) throw e;
    return null;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = performRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function handleAuthFailure(): Promise<void> {
  await tokenStorage.clear();
  onAuthFailure?.();
}

function toApiError(error: AxiosError): ApiError {
  if (error.response) return fromHttpResponse(error.response.status, error.response.data);
  if (error.code === 'ECONNABORTED' || error.code === AxiosError.ETIMEDOUT) return new ApiError('timeout', null);
  if (!networkState.isOnline()) return new ApiError('offline', null);
  return new ApiError('network', null);
}

http.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) throw new ApiError('unknown', null);
    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? '';

    if (error.response?.status === 401 && config && !config._retried && !NO_REFRESH.some((p) => url.includes(p))) {
      config._retried = true;
      let token: string | null;
      try {
        token = await refreshAccessToken();
      } catch {
        throw toApiError(error);
      }
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return http.request(config);
      }
      await handleAuthFailure();
    }

    const apiError = toApiError(error);
    logger.warn(`API ${config?.method?.toUpperCase() ?? ''} ${url} → ${apiError.kind}`, { status: apiError.status });
    throw apiError;
  },
);

// ---- typed helpers ---------------------------------------------------------

type Params = AxiosRequestConfig['params'];

export const api = {
  async get<T>(url: string, params?: Params, config?: AxiosRequestConfig): Promise<T> {
    return (await http.get<T>(url, { ...config, params })).data;
  },
  async post<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return (await http.post<T>(url, body, config)).data;
  },
  async put<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return (await http.put<T>(url, body, config)).data;
  },
  async patch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return (await http.patch<T>(url, body, config)).data;
  },
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return (await http.delete<T>(url, config)).data;
  },
};
