/**
 * Where a social provider must send the visitor back to.
 *
 * This was written out six times, each hard-coding
 * `http://localhost:4000/api/auth/<provider>/callback`. Two ways that bites:
 * run the API on any other port and the provider is handed a redirect_uri
 * pointing at 4000, and deploy without setting every *_CALLBACK_URL and it is
 * handed localhost. Either way the provider answers `redirect_uri_mismatch`,
 * which says nothing about the cause.
 *
 * The value is derived from one place now, so the URL the strategies use is
 * the same one printed at boot for registering with the provider.
 */

/**
 * Public base URL of this API, including the /api prefix and no trailing slash.
 *
 * API_URL (or PUBLIC_API_URL, which docker-compose already sets) is the
 * address the outside world uses — https://api.justkidora.com/api — not the
 * internal one Nginx forwards to. Two production rules:
 *
 *   - Google answers "Error 400: invalid_request" to any redirect_uri that is
 *     plain http on a real domain, and TikTok and Facebook refuse it too. So
 *     in production an http:// URL on a non-local host is upgraded to https.
 *   - "/api" is appended when it is missing, because every route lives there.
 */
export function apiBaseUrl(): string {
  const raw = (cleanEnv(process.env.API_URL) || cleanEnv(process.env.PUBLIC_API_URL)).replace(/\/+$/, '');
  if (!raw) return `http://localhost:${process.env.PORT ?? 4000}/api`;

  let url = raw.endsWith('/api') ? raw : `${raw}/api`;
  const local = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://') && !local) {
    url = 'https://' + url.slice('http://'.length);
  }
  return url;
}

/**
 * A value pasted into .env, as the provider expects it: surrounding quotes
 * and whitespace (including a Windows CR) removed. `GOOGLE_CLIENT_ID="…" `
 * with a trailing space reached Google byte for byte, and Google answers a
 * malformed client_id or redirect_uri with a bare "Error 400: invalid_request".
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Problems that will make a provider refuse sign-in, in words an operator can
 * act on. Printed at boot, and the start route refuses to send anyone to the
 * provider while one exists — Google's own page for these says only
 * "invalid_request", with the reason hidden behind "error details".
 */
export function callbackUrlProblems(provider: string): string[] {
  const url = oauthCallbackUrl(provider);
  const P = provider.toUpperCase();
  const problems: string[] = [];

  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { /* reported below */ }
  if (!parsed || !/^https?:$/.test(parsed.protocol)) {
    problems.push(`The redirect URI "${url}" is not a full http(s) URL. Set ${P}_CALLBACK_URL to e.g. http://localhost:4000/api/auth/${provider}/callback.`);
    return problems;
  }

  const local = LOCAL_HOST.test(parsed.hostname);
  if (parsed.protocol === 'http:' && !local && provider !== 'github') {
    // Google, Facebook ("Enforce HTTPS"), TikTok, Microsoft and Apple only
    // allow plain http for localhost (GitHub alone accepts it). Google wants
    // device parameters for a LAN address on top.
    problems.push(
      PRIVATE_IP.test(parsed.hostname)
        ? `${url} uses a local network address; ${provider} only accepts http://localhost or https. Open the app via localhost, or use an https tunnel.`
        : `${url} is not https; ${provider} will refuse it. Fix ${P}_CALLBACK_URL / API_URL.`,
    );
  }

  if (provider === 'google') {
    const { id, secret } = oauthCredentials('google');
    if (id && /^GOCSPX-/.test(id)) {
      problems.push('GOOGLE_CLIENT_ID holds the client secret (GOCSPX-…). Put the client ID (…apps.googleusercontent.com) there and the secret in GOOGLE_CLIENT_SECRET.');
    } else if (id && !/\.apps\.googleusercontent\.com$/.test(id)) {
      problems.push(`GOOGLE_CLIENT_ID "${id.slice(0, 12)}…" is not an OAuth client ID. Copy the "Client ID" ending in .apps.googleusercontent.com from Google Cloud → Credentials → OAuth 2.0 Client IDs (type "Web application").`);
    }
    if (secret && /\.apps\.googleusercontent\.com$/.test(secret)) {
      problems.push('GOOGLE_CLIENT_SECRET holds the client ID. Put the secret (GOCSPX-…) there.');
    }
  }
  return problems;
}

/**
 * Things that are not certain to fail, but usually explain a
 * redirect_uri_mismatch. Printed at boot; never block sign-in (a local
 * docker-compose run is NODE_ENV=production on localhost, legitimately).
 */
export function callbackUrlWarnings(provider: string): string[] {
  const url = oauthCallbackUrl(provider);
  const warnings: string[] = [];
  let host: string;
  try { host = new URL(url).hostname; } catch { return warnings; }
  if (process.env.NODE_ENV === 'production' && LOCAL_HOST.test(host)) {
    warnings.push('NODE_ENV=production but the redirect URI is localhost. On a server, set API_URL=https://<your api host>/api.');
  }
  if (host === '127.0.0.1' || host === '[::1]') {
    warnings.push(`the redirect URI uses ${host}; providers treat it as a different address from localhost, so register this exact string (or use localhost).`);
  }
  return warnings;
}

/**
 * The callback for one provider. An explicit `<PROVIDER>_CALLBACK_URL` always
 * wins — some providers require an exact string that differs from ours. A
 * trailing slash is dropped: ".../callback/" is a different URI to Google and
 * the cause of many redirect_uri_mismatch errors.
 */
export function oauthCallbackUrl(provider: string): string {
  const P = provider.toUpperCase();
  const explicit = cleanEnv(process.env[`${P}_CALLBACK_URL`]) || cleanEnv(process.env[`${P}_REDIRECT_URI`]);
  return (explicit || `${apiBaseUrl()}/auth/${provider}/callback`).replace(/\/+$/, '');
}

/**
 * Each provider's own name for its credentials is accepted alongside ours:
 * TikTok's "client key", Facebook's "app id / app secret".
 */
const CREDENTIAL_NAMES: Record<string, { id: string[]; secret: string[] }> = {
  tiktok: { id: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_ID'], secret: ['TIKTOK_CLIENT_SECRET'] },
  facebook: { id: ['FACEBOOK_APP_ID', 'FACEBOOK_CLIENT_ID'], secret: ['FACEBOOK_APP_SECRET', 'FACEBOOK_CLIENT_SECRET'] },
};

export function oauthCredentials(provider: string) {
  const names = CREDENTIAL_NAMES[provider] ?? {
    id: [`${provider.toUpperCase()}_CLIENT_ID`],
    secret: [`${provider.toUpperCase()}_CLIENT_SECRET`],
  };
  const pick = (keys: string[]) => keys.map((k) => cleanEnv(process.env[k])).find(Boolean) ?? '';
  return { id: pick(names.id), secret: pick(names.secret), idVar: names.id[0], secretVar: names.secret[0] };
}
