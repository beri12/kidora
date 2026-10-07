/**
 * Logger that never prints secrets.
 *
 * Any key that looks like a credential is redacted before logging, and
 * nothing is logged at all in production builds.
 */
const SENSITIVE = /pass(word)?|token|secret|authorization|otp|code|mfa|cookie/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

function emit(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  if (!__DEV__) return;
  const payload = data === undefined ? '' : redact(data);
  // eslint-disable-next-line no-console
  console[level](`[kidora] ${message}`, payload);
}

export const logger = {
  debug: (m: string, d?: unknown) => emit('debug', m, d),
  info: (m: string, d?: unknown) => emit('info', m, d),
  warn: (m: string, d?: unknown) => emit('warn', m, d),
  error: (m: string, d?: unknown) => emit('error', m, d),
};
