import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// Request tracing is useful while developing and noise (or a leak) in
// production: the URLs include ids, and anything logged here ends up in the
// browser console of every visitor. Gated on NODE_ENV rather than removed,
// so it is one env var away when debugging.
const debug = process.env.NODE_ENV !== 'production';
const trace = (...args: unknown[]) => { if (debug) console.log(...args); };

if (debug && typeof window !== 'undefined') {
  trace('[api] baseURL:', API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The refresh call deliberately does not go through `api`. The auth store's
// refresh() uses window.fetch directly, so it can never be caught by this
// same response interceptor and 401-loop (which caused hangs before).
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const store = useAuthStore.getState();
      const token = store.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    trace('[api] ->', config.method?.toUpperCase(), (config.baseURL ?? '') + (config.url ?? ''));
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => {
    trace('[api] <-', res.status, res.config.url);
    return res;
  },
  async (error: AxiosError) => {
    if (debug) console.error('[api] error', error.code, error.message, error.config?.url);

    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        if (!refreshing) {
          trace('[api] refreshing token...');
          refreshing = useAuthStore.getState().refresh();
        }

        const newToken = await refreshing;
        refreshing = null;
        trace('[api] refresh result:', newToken ? 'got new token' : 'null');

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