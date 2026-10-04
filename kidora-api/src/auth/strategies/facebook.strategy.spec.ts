import axios from 'axios';
import { UnauthorizedException } from '@nestjs/common';
import { FacebookStrategy, toOAuthProfile } from './facebook.strategy';

jest.mock('axios');
const mocked = axios as jest.Mocked<typeof axios>;

describe('Facebook profile → OAuthProfile', () => {
  it('maps the basic profile and never carries an email', () => {
    expect(toOAuthProfile({
      id: '1234567890', name: 'Abebe Kebede', first_name: 'Abebe', last_name: 'Kebede',
      picture: { data: { url: 'https://scontent.xx.fbcdn.net/a.jpg', is_silhouette: false } },
    })).toEqual({ provider: 'facebook', providerId: '1234567890', email: null, name: 'Abebe Kebede', avatarUrl: 'https://scontent.xx.fbcdn.net/a.jpg' });
  });

  it('uses the Kidora default avatar when Facebook only has the grey silhouette, or no picture', () => {
    expect(toOAuthProfile({ id: '1', name: 'A', picture: { data: { url: 'https://x/s.jpg', is_silhouette: true } } }).avatarUrl).toBeNull();
    expect(toOAuthProfile({ id: '1', name: 'A' }).avatarUrl).toBeNull();
  });

  it('builds a name from first/last when the display name is missing, and falls back safely', () => {
    expect(toOAuthProfile({ id: '1', first_name: 'Abebe', last_name: ' ' }).name).toBe('Abebe');
    expect(toOAuthProfile({ id: 1 }).name).toBe('Facebook User');
    expect(toOAuthProfile({ id: 1 }).providerId).toBe('1');
  });

  it('refuses a profile without an id', () => {
    expect(() => toOAuthProfile({ name: 'No Id' })).toThrow(UnauthorizedException);
    expect(() => toOAuthProfile({ id: '  ' })).toThrow(UnauthorizedException);
  });
});

describe('FacebookStrategy', () => {
  const saved = { ...process.env };
  beforeAll(() => Object.assign(process.env, { FACEBOOK_CLIENT_ID: 'app-id', FACEBOOK_CLIENT_SECRET: 'app-secret' }));
  afterAll(() => { process.env = saved; });

  it('asks Facebook for public_profile only — never email', () => {
    const s = new FacebookStrategy() as any;
    const url = new URL(s._oauth2.getAuthorizeUrl({ scope: s._scope, response_type: 'code', redirect_uri: 'http://localhost:4000/api/auth/facebook/callback' }));
    expect(url.searchParams.get('scope')).toBe('public_profile');
    expect(url.toString()).not.toMatch(/email/);
  });

  it('requests profile fields without email and returns the normalized profile', async () => {
    mocked.get.mockResolvedValueOnce({ data: { id: '42', name: 'Tigist' } });
    const profile = await new FacebookStrategy().validate('user-access-token');
    expect(profile).toEqual({ provider: 'facebook', providerId: '42', email: null, name: 'Tigist', avatarUrl: null });
    const [, opts] = mocked.get.mock.calls[0] as [string, { params: { fields: string } }];
    expect(opts.params.fields.split(',')).not.toContain('email');
  });

  it('lets a Graph API failure surface as an error (the guard turns it into a safe redirect)', async () => {
    mocked.get.mockRejectedValueOnce(new Error('Graph 500'));
    await expect(new FacebookStrategy().validate('t')).rejects.toThrow('Graph 500');
  });
});
