import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

function setup() {
  const rows: any[] = [];
  const prisma = {
    refreshToken: {
      create: jest.fn(async ({ data }: any) => { rows.push({ ...data }); return data; }),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.userId === where.userId)),
      delete: jest.fn(async ({ where }: any) => { rows.splice(rows.findIndex((r) => r.id === where.id), 1); }),
      deleteMany: jest.fn(async ({ where }: any) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if ((where.id && rows[i].id === where.id) || (where.userId && rows[i].userId === where.userId)) rows.splice(i, 1);
        }
        return { count: before - rows.length };
      }),
    },
  };
  const config = { get: (k: string) => ({ 'auth.accessSecret': 'a', 'auth.refreshSecret': 'r', 'auth.accessTtl': 900, 'auth.refreshTtl': 3600 } as any)[k] };
  const svc = new TokenService(new JwtService({}), config as any, prisma as any);
  return { svc, rows };
}

const user = { id: 'u1', email: 'a@b.c', role: 'PARENT' as any };

describe('TokenService refresh rotation', () => {
  it('redeems a refresh token once', async () => {
    const { svc } = setup();
    const { refreshToken } = await svc.issue(user);
    const payload = await svc.verifyRefresh(refreshToken);

    await expect(svc.consumeRefresh(refreshToken, payload)).resolves.toBe('u1');
    await expect(svc.consumeRefresh(refreshToken, payload)).resolves.toBeNull();
  });

  it('treats a replayed token as theft and ends every session', async () => {
    const { svc, rows } = setup();
    const first = await svc.issue(user);
    await svc.issue(user); // another device
    const p = await svc.verifyRefresh(first.refreshToken);
    await svc.consumeRefresh(first.refreshToken, p);
    expect(rows).toHaveLength(1);

    await svc.consumeRefresh(first.refreshToken, p); // replay
    expect(rows).toHaveLength(0);
  });

  it('still redeems a token issued before rotation existed (no rid), once', async () => {
    const { svc, rows } = setup();
    const { refreshToken } = await svc.issue(user);
    const { rid: _rid, ...legacy } = (await svc.verifyRefresh(refreshToken)) as any;
    await expect(svc.consumeRefresh(refreshToken, legacy)).resolves.toBe('u1');
    expect(rows).toHaveLength(0);
  });
});
