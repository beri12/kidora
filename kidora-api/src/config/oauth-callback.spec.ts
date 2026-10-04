import { apiBaseUrl, callbackUrlProblems, cleanEnv, oauthCallbackUrl, oauthCredentials } from './oauth-callback';

describe('OAuth callback URLs', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const set = (vars: Record<string, string | undefined>) => {
    for (const k of ['API_URL', 'PUBLIC_API_URL', 'GOOGLE_CALLBACK_URL', 'GOOGLE_REDIRECT_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CALLBACK_URL', 'NODE_ENV']) delete process.env[k];
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

  // Google answers each of these with a bare "Error 400: invalid_request".
  describe('Google invalid_request causes', () => {
    const ID = '1234567890-abcdef.apps.googleusercontent.com';

    it('strips quotes, spaces and a Windows CR from pasted values', () => {
      expect(cleanEnv(' "abc" ')).toBe('abc');
      expect(cleanEnv("'abc'\r")).toBe('abc');
      set({ GOOGLE_CLIENT_ID: ` "${ID}" `, GOOGLE_CLIENT_SECRET: 'GOCSPX-x\r', GOOGLE_CALLBACK_URL: '"http://localhost:4000/api/auth/google/callback" ' });
      expect(oauthCredentials('google')).toMatchObject({ id: ID, secret: 'GOCSPX-x' });
      expect(oauthCallbackUrl('google')).toBe('http://localhost:4000/api/auth/google/callback');
      expect(callbackUrlProblems('google')).toEqual([]);
    });

    it('a correct local setup has no problems', () => {
      set({ GOOGLE_CLIENT_ID: ID, GOOGLE_CLIENT_SECRET: 'GOCSPX-x' });
      expect(callbackUrlProblems('google')).toEqual([]);
    });

    it('flags a relative callback URL', () => {
      set({ GOOGLE_CLIENT_ID: ID, GOOGLE_CALLBACK_URL: '/api/auth/google/callback' });
      expect(callbackUrlProblems('google')[0]).toMatch(/not a full http\(s\) URL/);
    });

    it('flags http on a real domain or a LAN address, outside production too', () => {
      set({ GOOGLE_CLIENT_ID: ID, API_URL: 'http://api.justkidora.com/api' });
      expect(callbackUrlProblems('google')[0]).toMatch(/not https/);
      set({ GOOGLE_CLIENT_ID: ID, API_URL: 'http://192.168.1.20:4000/api' });
      expect(callbackUrlProblems('google')[0]).toMatch(/local network address/);
    });

    it('does not apply the https rule to GitHub, which accepts http', () => {
      set({ GITHUB_CALLBACK_URL: 'http://dev.example:4000/api/auth/github/callback' });
      expect(callbackUrlProblems('github')).toEqual([]);
    });

    it('flags a client id that is not an OAuth client id, or swapped with the secret', () => {
      set({ GOOGLE_CLIENT_ID: '123456789012' });
      expect(callbackUrlProblems('google')[0]).toMatch(/not an OAuth client ID/);
      set({ GOOGLE_CLIENT_ID: 'GOCSPX-abc', GOOGLE_CLIENT_SECRET: ID });
      const p = callbackUrlProblems('google').join(' ');
      expect(p).toMatch(/GOOGLE_CLIENT_ID holds the client secret/);
      expect(p).toMatch(/GOOGLE_CLIENT_SECRET holds the client ID/);
      expect(p).not.toContain('GOCSPX-abc'); // never echo a secret value
    });
  });
});
