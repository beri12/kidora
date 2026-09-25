import { BadRequestException, HttpStatus } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';

function fakeCache() {
  const store = new Map<string, { value: any; ttl: number }>();
  return {
    store,
    async get<T>(k: string) { return (store.get(k)?.value as T) ?? null; },
    async set(k: string, v: unknown, ttl = 60) { store.set(k, { value: v, ttl }); },
    async del(k: string) { store.delete(k); },
    async ttl(k: string) { return store.get(k)?.ttl ?? 0; },
    async incrWithTtl(k: string, ttl: number) {
      const next = ((store.get(k)?.value as number) ?? 0) + 1;
      store.set(k, { value: next, ttl });
      return next;
    },
  };
}

function fakePrisma(user: any) {
  let current = user;
  return {
    user: {
      findUnique: jest.fn(async ({ where }: any) => (current && where.email === current.email ? current : null)),
      update: jest.fn(async ({ data }: any) => { current = { ...current, ...data }; return current; }),
    },
    loginHistory: { create: jest.fn(async () => ({})) },
  };
}

const fakeEmail = () => ({
  sendVerificationCode: jest.fn(async (_to: string, _name: string, _code: string, _m: number) => ({ dev: false })),
  sendWelcome: jest.fn(),
});
const fakeTokens = () => ({ issue: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })) });

const USER = {
  id: 'u1', email: 'abebe@example.com', name: 'Abebe', emailVerified: false, roleConfirmed: true,
  passwordHash: 'hash', subscription: { plan: 'free' },
};

function setup(user: any = USER) {
  const cache = fakeCache();
  const email = fakeEmail();
  const prisma = fakePrisma(user);
  const svc = new EmailVerificationService(prisma as any, cache as any, email as any, fakeTokens() as any);
  const sentCode = () => email.sendVerificationCode.mock.calls.at(-1)![2];
  return { svc, cache, email, prisma, sentCode };
}

describe('EmailVerificationService', () => {
  it('emails a 6-digit code and never returns it', async () => {
    const { svc, email, sentCode } = setup();
    const res = await svc.send('Abebe@Example.com ', 'Abebe');

    expect(email.sendVerificationCode).toHaveBeenCalledWith('abebe@example.com', 'Abebe', expect.any(String), 10);
    expect(sentCode()).toMatch(/^\d{6}$/);
    expect(res).toMatchObject({ needsEmailVerification: true, email: 'abebe@example.com', maskedEmail: 'ab***@example.com' });
    expect(JSON.stringify(res)).not.toContain(sentCode());
  });

  it('verifies the address, signs in and sends the welcome email once', async () => {
    const { svc, email, prisma, sentCode } = setup();
    await svc.send('abebe@example.com', 'Abebe');

    const res = await svc.verify('abebe@example.com', sentCode());

    expect(res.accessToken).toBe('a');
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ emailVerified: true });
    expect(email.sendWelcome).toHaveBeenCalledTimes(1);
  });

  it('accepts a code only once', async () => {
    const { svc, sentCode } = setup();
    await svc.send('abebe@example.com', 'Abebe');
    const code = sentCode();

    await svc.verify('abebe@example.com', code);
    await expect(svc.verify('abebe@example.com', code)).rejects.toThrow(BadRequestException);
  });

  it('locks the code after five wrong guesses', async () => {
    const { svc, sentCode } = setup();
    await svc.send('abebe@example.com', 'Abebe');

    for (let i = 0; i < 5; i++) {
      await expect(svc.verify('abebe@example.com', '000000')).rejects.toThrow(BadRequestException);
    }
    await expect(svc.verify('abebe@example.com', sentCode())).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('enforces the resend cooldown, unless asked to stay quiet', async () => {
    const { svc, email } = setup();
    await svc.send('abebe@example.com', 'Abebe');

    await expect(svc.send('abebe@example.com', 'Abebe')).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    await expect(svc.send('abebe@example.com', 'Abebe', { quiet: true })).resolves.toMatchObject({ needsEmailVerification: true });
    expect(email.sendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it('drops the code when the email cannot be sent', async () => {
    const { svc, email, cache } = setup();
    email.sendVerificationCode.mockRejectedValueOnce(new Error('smtp down'));

    await expect(svc.send('abebe@example.com', 'Abebe')).rejects.toThrow('smtp down');
    expect(cache.store.has('otp:email:abebe@example.com')).toBe(false);
    expect(cache.store.has('otp:email:cooldown:abebe@example.com')).toBe(false);
  });

  it('answers resend identically for an unknown address, without sending anything', async () => {
    const { svc, email } = setup();
    const res = await svc.resend('nobody@example.com');

    expect(res).toMatchObject({ needsEmailVerification: true, email: 'nobody@example.com' });
    expect(email.sendVerificationCode).not.toHaveBeenCalled();
  });
});
