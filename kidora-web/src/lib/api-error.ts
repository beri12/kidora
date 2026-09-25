import { AxiosError } from 'axios';

/**
 * Pulls the human-readable message out of a Nest error response.
 *
 * Nest's ValidationPipe returns `message` as an array of strings, the
 * exception filters return it as one string, and a network failure has no
 * response at all — this collapses all three into one line to show the user.
 */
type Body = { message?: string | string[]; error?: string | Body };

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const res = (err as AxiosError<Body>)?.response;

  if (!res) {
    // No response: the request never landed (offline, DNS, CORS, timeout).
    return 'No connection. Check your internet and try again.';
  }

  // The API's global exception filter wraps Nest's body one level down:
  // { statusCode, path, timestamp, error: { message, error, statusCode } }.
  const body = typeof res.data?.error === 'object' && res.data.error ? res.data.error : res.data;
  const msg = body?.message ?? (typeof body?.error === 'string' ? body.error : undefined);
  // The route-level rate limiter's own wording is not meant for people.
  if (res.status === 429 && (!msg || String(msg).startsWith('ThrottlerException'))) {
    return 'Too many attempts. Please wait a moment.';
  }
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  if (typeof msg === 'string' && msg.trim()) return msg;

  return fallback;
}
