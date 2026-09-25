import { BadRequestException, HttpStatus } from '@nestjs/common';
import { PhoneAuthService } from './phone-auth.service';

// A tiny in-memory stand-in for the Redis-backed CacheService, with the two
// helpers the OTP flow relies on (TTL and an expiring counter).
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

function fakePrisma(initialUser: any = null) {
  let user = initialUser;
  return {
    get user_() { return user; },
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (!user) return null;
        if (where.phone && where.phone !== user.phone) return null;
        if (where.id && where.id !== user.id) return null;
        return user;
      }),
      create: jest.fn(async ({ data }: any) => {
        user = { id: 'u1', subscription: null, roleConfirmed: false, ...data };
        return user;
      }),
      update: jest.fn(async ({ data }: any) => {
        user = { ...user, ...data };
        return user;
      }),
    },
    subscription: { create: jest.fn(async () => ({})) },
    loginHistory: { create: jest.fn(async () => ({})) },
  };
}

const fakeSms = () =>
  ({ enabled: true, sendOtp: jest.fn(async (_to: string, _code: string) => ({ sid: 'x', dev: false })) });

/** Twilio configured, but refusing the send — a trial account's usual answer. */
const refusingSms = (code = 21608) => ({
  enabled: true,
  sendOtp: jest.fn(async () => {
    throw Object.assign(new Error('The number is unverified. Trial accounts may only send to verified numbers.'), { code });
  }),
});
const fakeTokens = () => ({ issue: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })) });

/** Reads the code out of the SMS the service claims to have sent. */
function sentCode(sms: ReturnType<typeof fakeSms>) {
  return sms.sendOtp.mock.calls[0][1];
}

describe('PhoneAuthService.normalize', () => {
  it('keeps a well-formed E.164 number as-is', () => {
    expect(PhoneAuthService.normalize('+251911223344')).toBe('+251911223344');
  });

  it('strips spaces, dashes and brackets', () => {
    expect(PhoneAuthService.normalize('+251 (91) 122-3344')).toBe('+251911223344');
  });

  it('rejects a number with no country code', () => {
    expect(() => PhoneAuthService.normalize('0911223344')).toThrow(BadRequestException);
  });

  it('rejects a number that is too short or too long', () => {
    expect(() => PhoneAuthService.normalize('+25191')).toThrow(BadRequestException);
    expect(() => PhoneAuthService.normalize('+2519112233445566')).toThrow(BadRequestException);
  });
});

describe('PhoneAuthService.mask', () => {
  it('keeps the country code and the last three digits only', () => {
    const masked = PhoneAuthService.mask('+251911223344');
    expect(masked.startsWith('+2519')).toBe(true);
    expect(masked.endsWith('344')).toBe(true);
    expect(masked).not.toContain('1122');
  });
});

describe('PhoneAuthService.start', () => {
  it('sends a 6-digit code and sets the resend cooldown', async () => {
    const cache = fakeCache();
    const sms = fakeSms();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, sms as any, fakeTokens() as any);

    const res = await svc.start({ phone: '+251911223344' }, '1.2.3.4');

    expect(res.sent).toBe(true);
    expect(sentCode(sms)).toMatch(/^\d{6}$/);
    expect(res.resendIn).toBeGreaterThan(0);
    // Never echo the code back when SMS is actually configured.
    expect(res).not.toHaveProperty('devCode');
  });

  it('stores the code hashed, never in clear text', async () => {
    const cache = fakeCache();
    const sms = fakeSms();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, sms as any, fakeTokens() as any);

    await svc.start({ phone: '+251911223344' });

    const stored = cache.store.get('otp:phone:+251911223344')!.value;
    expect(stored.hash).not.toContain(sentCode(sms));
    expect(stored.hash.startsWith('$2')).toBe(true);
  });

  it('refuses a second code inside the cooldown window', async () => {
    const cache = fakeCache();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, fakeSms() as any, fakeTokens() as any);

    await svc.start({ phone: '+251911223344' });
    await expect(svc.start({ phone: '+251911223344' })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('stops after five codes for the same number in an hour', async () => {
    const cache = fakeCache();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, fakeSms() as any, fakeTokens() as any);

    for (let i = 0; i < 5; i++) {
      await svc.start({ phone: '+251911223344' });
      cache.store.delete('otp:cooldown:+251911223344'); // pretend the cooldown lapsed
    }

    await expect(svc.start({ phone: '+251911223344' })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('drops the pending code when the SMS cannot be sent', async () => {
    const cache = fakeCache();
    const sms = { enabled: true, sendOtp: jest.fn(async () => { throw new Error('twilio down'); }) };
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, sms as any, fakeTokens() as any);

    await expect(svc.start({ phone: '+251911223344' })).rejects.toThrow();
    expect(cache.store.has('otp:phone:+251911223344')).toBe(false);
    // The cooldown is lifted too, so the visitor can retry straight away.
    expect(cache.store.has('otp:cooldown:+251911223344')).toBe(false);
  });
});

describe('PhoneAuthService.start never puts the code in the response', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  // The code proves the person holds the phone. Handing it to the browser —
  // as the old development fallback did — proves nothing.
  it('fails with a readable reason when Twilio refuses the send, in development too', async () => {
    process.env.NODE_ENV = 'development';
    const cache = fakeCache();
    const { SmsDeliveryError } = await import('../../infrastructure/sms/sms.service');
    const sms = {
      enabled: true,
      sendOtp: jest.fn(async () => { throw new SmsDeliveryError("That number can't receive text messages.", 21614); }),
    };
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, sms as any, fakeTokens() as any);

    await expect(svc.start({ phone: '+251911223344' }, '1.2.3.4')).rejects.toThrow("can't receive text messages");
    expect([...cache.store.keys()].filter((k) => k.startsWith('otp:phone:'))).toHaveLength(0);
    expect([...cache.store.keys()].filter((k) => k.startsWith('otp:cooldown:'))).toHaveLength(0);
  });

  it('fails in production too, and never leaks the code', async () => {
    process.env.NODE_ENV = 'production';
    const cache = fakeCache();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, refusingSms() as any, fakeTokens() as any);

    await expect(svc.start({ phone: '+251911223344' }, '1.2.3.4')).rejects.toThrow();
  });

  it('omits the code when Twilio is not configured in development (it is only logged)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AUTH_TEST_EXPOSE_OTP;
    const sms = { enabled: false, sendOtp: jest.fn(async () => ({ sid: 'dev', dev: true })) };
    const svc = new PhoneAuthService(fakePrisma() as any, fakeCache() as any, sms as any, fakeTokens() as any);

    const res = await svc.start({ phone: '+251911223344' });

    expect(res.sent).toBe(true);
    expect(res).not.toHaveProperty('devCode');
    expect(sms.sendOtp).toHaveBeenCalledTimes(1);
  });

  it('exposes it only to the e2e suite, only when opted in, and never in production', async () => {
    const sms = { enabled: false, sendOtp: jest.fn(async () => ({ sid: 'dev', dev: true })) };

    process.env.NODE_ENV = 'development';
    process.env.AUTH_TEST_EXPOSE_OTP = 'true';
    const dev = new PhoneAuthService(fakePrisma() as any, fakeCache() as any, sms as any, fakeTokens() as any);
    expect((await dev.start({ phone: '+251911223344' })).devCode).toMatch(/^\d{6}$/);

    process.env.NODE_ENV = 'production';
    const prod = new PhoneAuthService(fakePrisma() as any, fakeCache() as any, sms as any, fakeTokens() as any);
    expect(await prod.start({ phone: '+251911223355' })).not.toHaveProperty('devCode');
  });
});

describe('PhoneAuthService.verify', () => {
  async function setup(existingUser: any = null) {
    const cache = fakeCache();
    const sms = fakeSms();
    const prisma = fakePrisma(existingUser);
    const svc = new PhoneAuthService(prisma as any, cache as any, sms as any, fakeTokens() as any);
    await svc.start({ phone: '+251911223344' });
    return { svc, cache, prisma, code: sentCode(sms) };
  }

  it('creates the account on first use and asks for a role', async () => {
    const { svc, prisma, code } = await setup();

    const res = await svc.verify({ phone: '+251911223344', code });

    expect(res.isNewUser).toBe(true);
    expect(res.needsRole).toBe(true);
    expect(res.accessToken).toBe('a');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      phone: '+251911223344',
      phoneVerified: true,
      roleConfirmed: false,
    });
    expect(prisma.subscription.create).toHaveBeenCalled();
  });

  it('signs an existing number in without creating a second account', async () => {
    const { svc, prisma, code } = await setup({
      id: 'u1', phone: '+251911223344', phoneVerified: true, name: 'Abebe',
      role: 'TEACHER', roleConfirmed: true, subscription: { plan: 'free' },
    });

    const res = await svc.verify({ phone: '+251911223344', code });

    expect(res.isNewUser).toBe(false);
    expect(res.needsRole).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('never returns the password hash or MFA secret', async () => {
    const { svc, code } = await setup({
      id: 'u1', phone: '+251911223344', phoneVerified: true, name: 'Abebe', role: 'PARENT',
      roleConfirmed: true, passwordHash: 'secret-hash', mfaSecret: 'secret', backupCodes: ['x'],
      subscription: null,
    });

    const res = await svc.verify({ phone: '+251911223344', code });

    expect(res.user).not.toHaveProperty('passwordHash');
    expect(res.user).not.toHaveProperty('mfaSecret');
    expect(res.user).not.toHaveProperty('backupCodes');
  });

  it('rejects a wrong code without burning the real one', async () => {
    const { svc, code } = await setup();

    await expect(svc.verify({ phone: '+251911223344', code: '000000' })).rejects.toThrow(BadRequestException);
    await expect(svc.verify({ phone: '+251911223344', code })).resolves.toMatchObject({ isNewUser: true });
  });

  it('locks the code after five wrong guesses', async () => {
    const { svc, code } = await setup();

    for (let i = 0; i < 5; i++) {
      await expect(svc.verify({ phone: '+251911223344', code: '000000' })).rejects.toThrow(BadRequestException);
    }

    // Even the correct code is refused now — a new one has to be requested.
    await expect(svc.verify({ phone: '+251911223344', code })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('accepts the code only once', async () => {
    const { svc, code } = await setup();

    await svc.verify({ phone: '+251911223344', code });
    await expect(svc.verify({ phone: '+251911223344', code })).rejects.toThrow(BadRequestException);
  });

  it('refuses a code for a number that never requested one', async () => {
    const cache = fakeCache();
    const svc = new PhoneAuthService(fakePrisma() as any, cache as any, fakeSms() as any, fakeTokens() as any);

    await expect(svc.verify({ phone: '+251911223344', code: '123456' })).rejects.toThrow(BadRequestException);
  });
});
