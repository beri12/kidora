import { AxiosError } from 'axios';

/**
 * Pulls the human-readable message out of a Nest error response.
 *
 * Nest's ValidationPipe returns `message` as an array of strings, the
 * exception filters return it as one string, and a network failure has no
 * response at all — this collapses all three into one line to show the user.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const res = (err as AxiosError<{ message?: string | string[]; error?: string }>)?.response;

  if (!res) {
    // No response: the request never landed (offline, DNS, CORS, timeout).
    return 'No connection. Check your internet and try again.';
  }

  const msg = res.data?.message ?? res.data?.error;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  if (typeof msg === 'string' && msg.trim()) return msg;

  if (res.status === 429) return 'Too many attempts. Please wait a moment.';
  return fallback;
}
