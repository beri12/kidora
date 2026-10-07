/**
 * Runtime configuration.
 *
 * Only EXPO_PUBLIC_* values are available here, and they ship inside the app
 * bundle — treat every one as public. Secrets live on the backend.
 */
export type AppEnvironment = 'development' | 'preview' | 'production';

const PRODUCTION_API = 'https://api.justkidora.com/api';
const PRODUCTION_SOCKET = 'https://api.justkidora.com';
const DEV_API = 'http://localhost:4000/api';
const DEV_SOCKET = 'http://localhost:4000';

function readEnvironment(): AppEnvironment {
  const raw = process.env.EXPO_PUBLIC_ENVIRONMENT;
  if (raw === 'production' || raw === 'preview' || raw === 'development') return raw;
  return __DEV__ ? 'development' : 'production';
}

const environment = readEnvironment();
const isProd = environment === 'production';

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Production must talk HTTPS. A misconfigured http:// URL in a release build
 * would send children's tokens in clear text, so fail closed to the known
 * production host instead.
 */
function enforceHttps(url: string, fallback: string): string {
  if (!isProd) return url;
  return url.startsWith('https://') ? url : fallback;
}

export const env = {
  environment,
  isProduction: isProd,
  isDevelopment: environment === 'development',
  apiUrl: enforceHttps(
    stripSlash(process.env.EXPO_PUBLIC_API_URL ?? (isProd ? PRODUCTION_API : DEV_API)),
    PRODUCTION_API,
  ),
  socketUrl: enforceHttps(
    stripSlash(process.env.EXPO_PUBLIC_SOCKET_URL ?? (isProd ? PRODUCTION_SOCKET : DEV_SOCKET)),
    PRODUCTION_SOCKET,
  ),
  /** Request timeout. Generous because many learners are on 2G/3G. */
  requestTimeoutMs: 20_000,
  /** Universal-link host for production deep links. */
  webHost: 'justkidora.com',
} as const;
