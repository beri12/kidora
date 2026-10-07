import { ApiError } from '@/lib/errors';
import { networkState } from '@/lib/network-state';
import { tokenStorage } from '@/lib/secure-storage';
import { api, setAuthFailureHandler } from '@/services/api';

import { mockBackend } from '@/test-utils/mockBackend';

describe('API client', () => {
  beforeEach(async () => {
    tokenStorage.resetMemory();
    await tokenStorage.clear();
    networkState.set(true);
  });

  it('attaches the bearer token from secure storage', async () => {
    await tokenStorage.setTokens({ accessToken: 'A1', refreshToken: 'R1' });
    const calls = mockBackend(() => ({ status: 200, data: { ok: true } }));
    await api.get('/student/dashboard');
    expect(calls[0]?.auth).toBe('Bearer A1');
  });

  it('refreshes an expired access token once and replays the request', async () => {
    await tokenStorage.setTokens({ accessToken: 'OLD', refreshToken: 'R1' });
    const calls = mockBackend((c) => {
      if (c.url === '/auth/refresh') return { status: 201, data: { accessToken: 'NEW', refreshToken: 'R2' } };
      return c.auth === 'Bearer NEW' ? { status: 200, data: { ok: 1 } } : { status: 401, data: { statusCode: 401, error: 'Unauthorized' } };
    });
    await expect(api.get('/student/dashboard')).resolves.toEqual({ ok: 1 });
    expect(calls.map((c) => c.url)).toEqual(['/student/dashboard', '/auth/refresh', '/student/dashboard']);
    expect(await tokenStorage.getTokens()).toEqual({ accessToken: 'NEW', refreshToken: 'R2' });
  });

  it('shares one refresh between concurrent 401s', async () => {
    await tokenStorage.setTokens({ accessToken: 'OLD', refreshToken: 'R1' });
    const calls = mockBackend((c) => {
      if (c.url === '/auth/refresh') return { status: 201, data: { accessToken: 'NEW', refreshToken: 'R2' } };
      return c.auth === 'Bearer NEW' ? { status: 200, data: c.url } : { status: 401, data: {} };
    });
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
  });

  it('clears the session and notifies auth when refresh fails', async () => {
    await tokenStorage.setTokens({ accessToken: 'OLD', refreshToken: 'REVOKED' });
    const onFail = jest.fn();
    setAuthFailureHandler(onFail);
    mockBackend((c) => (c.url === '/auth/refresh' ? { status: 401, data: { error: 'Refresh token revoked' } } : { status: 401, data: {} }));
    await expect(api.get('/student/dashboard')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(await tokenStorage.getTokens()).toBeNull();
    setAuthFailureHandler(null);
  });

  it('does not try to refresh on a failed login', async () => {
    const calls = mockBackend(() => ({ status: 401, data: { error: 'Invalid credentials' } }));
    await expect(api.post('/auth/login', { email: 'x', password: 'y' })).rejects.toMatchObject({ kind: 'unauthorized', serverMessage: 'Invalid credentials' });
    expect(calls).toHaveLength(1);
  });

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate_limited'],
    [500, 'server'],
  ])('normalises HTTP %i into ApiError(%s)', async (status, kind) => {
    mockBackend(() => ({ status, data: { statusCode: status, error: 'boom' } }));
    const err = await api.get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe(kind);
  });

  it('reports offline vs network failures', async () => {
    mockBackend(() => 'network');
    await expect(api.get('/x')).rejects.toMatchObject({ kind: 'network' });
    networkState.set(false);
    await expect(api.get('/x')).rejects.toMatchObject({ kind: 'offline' });
  });
});
