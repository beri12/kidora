import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

if (typeof window !== 'undefined') {
  console.log('[api] baseURL:', API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate, non-intercepted instance just for the refresh call.
// This avoids the refresh request being caught by this same
// response interceptor if it also 401s (which caused hangs before).
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 8000, // shorter than main timeout, so refresh fails fast
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const store = useAuthStore.getState();
      const token = store.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log('[api] ->', config.method?.toUpperCase(), (config.baseURL ?? '') + (config.url ?? ''));
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => {
    console.log('[api] <-', res.status, res.config.url);
    return res;
  },
  async (error: AxiosError) => {
    console.error('[api] error', error.code, error.message, error.config?.url);

    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        if (!refreshing) {
          console.log('[api] refreshing token...');
          refreshing = useAuthStore.getState().refresh(refreshClient);
        }

        const newToken = await refreshing;
        refreshing = null;
        console.log('[api] refresh result:', newToken ? 'got new token' : 'null');

        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (refreshErr) {
        console.error('[api] refresh failed:', refreshErr);
        refreshing = null;
      }

      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);