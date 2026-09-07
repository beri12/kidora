import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { API_BASE_URL } from '@/lib/api/client';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

// Re-exported from lib/api/client so both clients cannot resolve to different
// hosts. Kept as `API_URL` because existing modules import that name.
export const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
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
          refreshing = useAuthStore.getState().refresh();
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