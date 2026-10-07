import { tokenStorage } from '@/lib/secure-storage';
import { authService, parseOAuthCallback, UnsupportedRoleError } from '@/services/auth.service';

import { mockBackend } from '@/test-utils/mockBackend';

const session = { accessToken: 'A', refreshToken: 'R', user: { id: 'u1', name: 'Charles', role: 'CHILD' } };

describe('AuthService', () => {
  beforeEach(async () => {
    tokenStorage.resetMemory();
    await tokenStorage.clear();
  });

  it('login() stores tokens securely and reads the role from /auth/me', async () => {
    const calls = mockBackend((c) => {
      if (c.url === '/auth/login') return { status: 201, data: session };
      if (c.url === '/auth/me') return { status: 200, data: { id: 'u1', name: 'Charles', role: 'CHILD', school: { id: 's', name: 'Sunrise' } } };
      return { status: 404, data: {} };
    });
    const user = await authService.login({ identifier: 'Kid@Example.com ', password: 'Password123' });
    expect(user.role).toBe('STUDENT');
    expect(user.school?.name).toBe('Sunrise');
    expect(calls[0]?.data).toEqual({ email: 'kid@example.com', password: 'Password123', mfaCode: undefined });
    expect(await tokenStorage.getTokens()).toEqual({ accessToken: 'A', refreshToken: 'R' });
  });

  it('login() accepts a phone number as identifier', async () => {
    const calls = mockBackend((c) => (c.url === '/auth/login' ? { status: 201, data: session } : { status: 200, data: { id: 'u1', name: 'P', role: 'PARENT' } }));
    await authService.login({ identifier: '+251912345678', password: 'pw' });
    expect(calls[0]?.data).toMatchObject({ phone: '+251912345678' });
  });

  it('register() sends the backend role enum', async () => {
    const calls = mockBackend((c) => (c.url === '/auth/register' ? { status: 201, data: session } : { status: 200, data: { id: 'u1', name: 'T', role: 'DISTRICT_ADMIN' } }));
    const user = await authService.register({ name: 'T', email: 't@x.com', password: 'Password123', role: 'DISTRICT_LEADER', districtName: 'Central' });
    expect(calls[0]?.data).toMatchObject({ role: 'DISTRICT_ADMIN', districtName: 'Central' });
    expect(user.role).toBe('DISTRICT_LEADER');
  });

  it('verifyOtp() completes SMS sign-in', async () => {
    mockBackend((c) => (c.url === '/auth/otp/verify' ? { status: 201, data: session } : { status: 200, data: { id: 'u1', name: 'X', role: 'TEACHER' } }));
    const user = await authService.verifyOtp('+251900000000', '123456');
    expect(user.role).toBe('TEACHER');
  });

  it('rejects platform-admin accounts on mobile', async () => {
    mockBackend((c) => (c.url === '/auth/login' ? { status: 201, data: session } : { status: 200, data: { id: 'a', name: 'Admin', role: 'SUPER_ADMIN' } }));
    await expect(authService.login({ identifier: 'a@x.com', password: 'p' })).rejects.toBeInstanceOf(UnsupportedRoleError);
  });

  it('restoreSession() returns null without stored tokens', async () => {
    await expect(authService.restoreSession()).resolves.toBeNull();
  });

  it('logout() clears tokens even when offline', async () => {
    await tokenStorage.setTokens({ accessToken: 'A', refreshToken: 'R' });
    mockBackend(() => 'network');
    await authService.logout();
    expect(await tokenStorage.getTokens()).toBeNull();
  });

  it('parses OAuth callback fragments', () => {
    expect(parseOAuthCallback('kidora://oauth#accessToken=a&refreshToken=b&needsRole=0')).toEqual({ accessToken: 'a', refreshToken: 'b' });
    expect(parseOAuthCallback('kidora://oauth#error=denied')).toBeNull();
  });
});
