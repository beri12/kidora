import { BadRequestException } from '@nestjs/common';
import { OAuthService } from './oauth.service';

/** Just enough Prisma for find-or-create-and-link over users + social accounts. */
function fakeDb() {
  const users: any[] = [];
  const links: any[] = [];
  let n = 0;
  const withLinks = (data: any, u: any) => {
    const sa = data.socialAccounts?.create;
    if (sa) {
      if (links.some((l) => l.provider === sa.provider && l.providerId === sa.providerId)) throw new Error('unique violation');
      links.push({ ...sa, userId: u.id });
    }
  };
  return {
    users, links,
    socialAccount: {
      findUnique: jest.fn(async ({ where }: any) => {
        const l = links.find((x) => x.provider === where.provider_providerId.provider && x.providerId === where.provider_providerId.providerId);
        return l ? { ...l, user: users.find((u) => u.id === l.userId) } : null;
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: any) =>
        users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const { socialAccounts, subscription, ...rest } = data;
        const u = { id: `u${++n}`, active: true, avatarUrl: null, passwordHash: null, ...rest };
        users.push(u);
        withLinks({ socialAccounts }, u);
        return u;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const u = users.find((x) => x.id === where.id);
        const { socialAccounts, ...rest } = data;
        Object.assign(u, rest);
        withLinks({ socialAccounts }, u);
        return u;
      }),
    },
  };
}

function fakeCache() {
  const m = new Map<string, any>();
  return {
    m,
    async get(k: string) { return m.get(k) ?? null; },
    async set(k: string, v: unknown) { m.set(k, v); },
    async del(k: string) { m.delete(k); },
  };
}

function setup() {
  const db = fakeDb();
  const cache = fakeCache();
  const tokens = { issue: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })) };
  const email = { sendWelcome: jest.fn() };
  const svc = new OAuthService(db as any, tokens as any, email as any, cache as any);
  return { svc, db, cache, tokens };
}

const google = { provider: 'google', providerId: 'g-1', email: 'abebe@example.com', name: 'Abebe', avatarUrl: 'https://x/a.png' };

describe('OAuthService', () => {
  it('creates one user with a linked Google account and its avatar', async () => {
    const { svc, db } = setup();
    const u = await svc.resolveUser(google);
    expect(db.users).toHaveLength(1);
    expect(db.links).toEqual([expect.objectContaining({ provider: 'GOOGLE', providerId: 'g-1', userId: u.id })]);
    expect(u.avatarUrl).toBe('https://x/a.png');
  });

  it('signs the same identity into the same user, never a duplicate', async () => {
    const { svc, db } = setup();
    const a = await svc.resolveUser(google);
    const b = await svc.resolveUser({ ...google, email: 'changed@example.com' });
    expect(b.id).toBe(a.id);
    expect(db.users).toHaveLength(1);
  });

  it('links TikTok (no email) and Google to separate users unless the email matches', async () => {
    const { svc, db } = setup();
    await svc.resolveUser(google);
    await svc.resolveUser({ provider: 'tiktok', providerId: 't-1', name: 'Tok' });
    expect(db.users).toHaveLength(2);
  });

  it('attaches a provider to the existing user with the same email', async () => {
    const { svc, db } = setup();
    db.users.push({ id: 'existing', email: 'abebe@example.com', emailVerified: true, passwordHash: 'h', active: true, avatarUrl: null });
    const u = await svc.resolveUser(google);
    expect(u.id).toBe('existing');
    expect(u.passwordHash).toBe('h');
    expect(db.links[0].userId).toBe('existing');
  });

  it('drops an unproven password when the provider proves the address', async () => {
    const { svc, db } = setup();
    db.users.push({ id: 'squatter', email: 'abebe@example.com', emailVerified: false, passwordHash: 'attacker', active: true });
    const u = await svc.resolveUser(google);
    expect(u.passwordHash).toBeNull();
    expect(u.emailVerified).toBe(true);
  });

  it('rejects an unknown provider', async () => {
    const { svc } = setup();
    await expect(svc.resolveUser({ provider: 'myspace', providerId: '1', name: 'x' })).rejects.toThrow(BadRequestException);
  });
});

describe('OAuthService exchange code (no tokens in URLs)', () => {
  it('returns a code, not tokens, and redeems it exactly once', async () => {
    const { svc, db } = setup();
    const { code, needsRole } = await svc.createExchangeCode(google);
    expect(code).toMatch(/^[\w-]{24,}$/);
    expect(needsRole).toBe(true);

    (db.user.findUnique as jest.Mock).mockImplementationOnce(async () => ({ ...db.users[0], subscription: null }));
    const first = await svc.redeemExchangeCode(code);
    expect(first.accessToken).toBe('a');
    expect(first.user).not.toHaveProperty('passwordHash');

    await expect(svc.redeemExchangeCode(code)).rejects.toThrow(BadRequestException);
  });
});
