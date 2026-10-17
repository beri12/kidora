import { Logger } from '@nestjs/common';

type OriginCallback = (err: Error | null, allow?: boolean) => void;

const normalize = (o: string) => o.trim().replace(/^(['"])(.*)\1$/, '$2').trim().replace(/\/+$/, '');

/**
 * The browser origins allowed to call this API with credentials.
 *
 * CORS_ORIGIN is the explicit allow-list. WEB_URL — the web app this API
 * redirects people back to after sign-in — is always added: an allow-list
 * that leaves out the app's own frontend can only produce "No connection"
 * in the browser. Unset CORS_ORIGIN keeps the old behaviour of reflecting
 * the requesting origin.
 */
export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] | null {
  const listed = (env.CORS_ORIGIN ?? '').split(',').map(normalize).filter(Boolean);
  if (!listed.length) return null;
  let web: string | null = null;
  try { web = env.WEB_URL ? new URL(normalize(env.WEB_URL)).origin : null; } catch { /* reported at boot */ }
  return [...new Set([...listed, ...(web ? [web] : [])])];
}

/**
 * The `origin` option for app.enableCors. A refused origin is logged once,
 * with the allow-list, since the browser only says "network error".
 */
export function corsOriginOption(env: NodeJS.ProcessEnv = process.env): true | ((origin: string | undefined, cb: OriginCallback) => void) {
  const allowed = allowedOrigins(env);
  if (!allowed) return true;
  const logger = new Logger('CORS');
  const warned = new Set<string>();
  return (origin, cb) => {
    // Same-origin requests, curl and server-to-server calls send no Origin.
    if (!origin || allowed.includes(origin)) return cb(null, true);
    if (!warned.has(origin)) {
      warned.add(origin);
      logger.warn(`Refused browser origin ${origin}. Allowed: ${allowed.join(', ')} (CORS_ORIGIN + WEB_URL).`);
    }
    return cb(null, false);
  };
}
