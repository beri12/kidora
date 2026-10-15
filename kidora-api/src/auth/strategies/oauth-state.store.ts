import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE = 'kidora_oauth_state';
const TTL_SECONDS = 600; // the round trip to the provider, with room for a 2FA prompt

function secret() {
  return process.env.OAUTH_STATE_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-oauth-state-secret';
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function readCookie(req: any, name: string): string | null {
  const header: string = req?.headers?.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function cookieOptions(req: any) {
  const secure = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https';
  // Lax is sent on the provider's top-level GET redirect back to us, and not
  // on cross-site subresource requests — exactly what this check needs.
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: TTL_SECONDS * 1000 };
}

/**
 * OAuth `state` without a server-side session.
 *
 * Without a state check anyone can hand a victim a callback URL carrying the
 * attacker's own authorization code, and the victim ends up signed in to the
 * attacker's account (login CSRF). passport-oauth2's built-in stores keep the
 * nonce in express-session, which this API does not run.
 *
 * Here the nonce is set in a short-lived httpOnly cookie on the way out, and
 * the `state` sent to the provider is that nonce plus an expiry, HMAC-signed.
 * On the way back both must match, the signature must hold and the expiry
 * must not have passed. The cookie ties the flow to the browser that started
 * it; the signature stops it being forged.
 */
export class SignedCookieStateStore {
  store(req: any, _meta: unknown, cb: (err: Error | null, state?: string) => void) {
    try {
      const nonce = randomBytes(16).toString('base64url');
      const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
      const payload = `${nonce}.${exp}`;
      req.res?.cookie?.(COOKIE, nonce, cookieOptions(req));
      cb(null, `${payload}.${sign(payload)}`);
    } catch (err) {
      cb(err as Error);
    }
  }

  verify(req: any, state: string, _meta: unknown, cb: (err: Error | null, ok: boolean, info?: { message: string }) => void) {
    const fail = (message: string) => cb(null, false, { message });
    const cookie = readCookie(req, COOKIE);
    req.res?.clearCookie?.(COOKIE, { path: '/' });

    const [nonce, exp, mac] = String(state ?? '').split('.');
    if (!nonce || !exp || !mac) return fail('missing_state');

    const expected = Buffer.from(sign(`${nonce}.${exp}`));
    const given = Buffer.from(mac);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return fail('bad_state');
    if (Number(exp) < Date.now() / 1000) return fail('expired_state');
    if (!cookie || cookie !== nonce) return fail('state_mismatch');

    cb(null, true);
  }
}

/** One instance is enough: it holds no per-flow data. */
export const oauthStateStore = new SignedCookieStateStore();
