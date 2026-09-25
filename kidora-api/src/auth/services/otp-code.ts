import { randomInt } from 'crypto';

/** A 6-digit one-time code from the OS CSPRNG (Math.random is guessable). */
export function newOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * The one way a code may appear in an API response: the automated end-to-end
 * suite (scripts/e2e-auth-flow.sh) sets AUTH_TEST_EXPOSE_OTP=true on a local
 * API with no SMS or mail provider configured, because it has no handset or
 * inbox to read the code from. Never honoured in production, and the web app
 * never renders it — a code shown on screen proves nothing about who owns the
 * number or the inbox.
 */
export function exposeOtpForTests(): boolean {
  return process.env.AUTH_TEST_EXPOSE_OTP === 'true' && process.env.NODE_ENV !== 'production';
}
