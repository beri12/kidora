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
  const raw = (process.env.API_URL || process.env.PUBLIC_API_URL)?.trim().replace(/\/+$/, '');
  if (!raw) return `http://localhost:${process.env.PORT ?? 4000}/api`;

  let url = raw.endsWith('/api') ? raw : `${raw}/api`;
  const local = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://') && !local) {
    url = 'https://' + url.slice('http://'.length);
  }
  return url;
}

/**
 * Problems with the callback URLs that will make a provider refuse sign-in,
 * in words an operator can act on. Printed at boot.
 */
export function callbackUrlProblems(provider: string): string[] {
  const url = oauthCallbackUrl(provider);
  const problems: string[] = [];
  if (process.env.NODE_ENV === 'production') {
    if (/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
      problems.push('API_URL is not set, so the provider would be sent to localhost. Set API_URL=https://<your api host>/api.');
    } else if (url.startsWith('http://')) {
      problems.push(`${url} is not https; ${provider} will refuse it. Fix ${provider.toUpperCase()}_CALLBACK_URL.`);
    }
  }
  return problems;
}

/**
 * The callback for one provider. An explicit `<PROVIDER>_CALLBACK_URL` always
 * wins — some providers require an exact string that differs from ours.
 */
export function oauthCallbackUrl(provider: string): string {
  const P = provider.toUpperCase();
  const explicit = (process.env[`${P}_CALLBACK_URL`] || process.env[`${P}_REDIRECT_URI`])?.trim();
  return explicit || `${apiBaseUrl()}/auth/${provider}/callback`;
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
  const pick = (keys: string[]) => keys.map((k) => process.env[k]?.trim()).find(Boolean) ?? '';
  return { id: pick(names.id), secret: pick(names.secret), idVar: names.id[0], secretVar: names.secret[0] };
}
