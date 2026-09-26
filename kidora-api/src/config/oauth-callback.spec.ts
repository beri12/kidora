import { apiBaseUrl, callbackUrlProblems, oauthCallbackUrl } from './oauth-callback';

describe('OAuth callback URLs', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const set = (vars: Record<string, string | undefined>) => {
    for (const k of ['API_URL', 'PUBLIC_API_URL', 'GOOGLE_CALLBACK_URL', 'GOOGLE_REDIRECT_URI', 'NODE_ENV']) delete process.env[k];
    Object.assign(process.env, vars);
  };

  it('uses https in production even when API_URL says http (Google: invalid_request)', () => {
    set({ NODE_ENV: 'production', API_URL: 'http://api.justkidora.com/api' });
    expect(oauthCallbackUrl('google')).toBe('https://api.justkidora.com/api/auth/google/callback');
  });

  it('adds the /api prefix when API_URL leaves it off', () => {
    set({ API_URL: 'https://api.justkidora.com/' });
    expect(apiBaseUrl()).toBe('https://api.justkidora.com/api');
  });

  it('accepts PUBLIC_API_URL, which docker-compose sets', () => {
    set({ PUBLIC_API_URL: 'https://api.justkidora.com' });
    expect(oauthCallbackUrl('tiktok')).toBe('https://api.justkidora.com/api/auth/tiktok/callback');
  });

  it('keeps http for localhost in development', () => {
    set({ API_URL: 'http://localhost:4000/api' });
    expect(oauthCallbackUrl('google')).toBe('http://localhost:4000/api/auth/google/callback');
  });

  it('prefers an explicit per-provider redirect URI', () => {
    set({ API_URL: 'https://a.example/api', GOOGLE_REDIRECT_URI: 'https://b.example/cb' });
    expect(oauthCallbackUrl('google')).toBe('https://b.example/cb');
  });

  it('names the problem when production has no API_URL', () => {
    set({ NODE_ENV: 'production' });
    expect(callbackUrlProblems('google')[0]).toMatch(/API_URL is not set/);
  });
});
