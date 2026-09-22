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

/** Public base URL of this API, including the /api prefix and no trailing slash. */
export function apiBaseUrl(): string {
  const configured = process.env.API_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  return `http://localhost:${process.env.PORT ?? 4000}/api`;
}

/**
 * The callback for one provider. An explicit `<PROVIDER>_CALLBACK_URL` always
 * wins — some providers require an exact string that differs from ours.
 */
export function oauthCallbackUrl(provider: string): string {
  const explicit = process.env[`${provider.toUpperCase()}_CALLBACK_URL`]?.trim();
  return explicit || `${apiBaseUrl()}/auth/${provider}/callback`;
}
