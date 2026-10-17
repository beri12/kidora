import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { SmsService } from '../../infrastructure/sms/sms.service';

function fakeCache() {
  const m = new Map<string, { v: unknown; exp: number }>();
  const live = (k: string) => { const e = m.get(k); if (e && e.exp > Date.now()) return e; m.delete(k); return null; };
  return {
    m,
    async get<T>(k: string) { return (live(k)?.v as T) ?? null; },
    async set(k: string, v: unknown, ttl = 60) { m.set(k, { v, exp: Date.now() + ttl * 1000 }); },
    async del(k: string) { m.delete(k); },
    async ttl(k: string) { const e = live(k); return e ? Math.ceil((e.exp - Date.now()) / 1000) : -2; },
    async incrWithTtl(k: string, ttl: number) { const n = ((live(k)?.v as number) ?? 0) + 1; m.set(k, { v: n, exp: live(k)?.exp ?? Date.now() + ttl * 1000 }); return n; },
  };
}

const PHONE = '+251911223344';

function setup(user: Record<string, unknown> | null = { id: 'u1', active: true, phoneVerified: false, mfaEnabled: false, lockedUntil: null }) {
  process.env.SMS_DEFAULT_COUNTRY_CODE = '+251';
  const sms = new SmsService();
  const texts: { to: string; body: string }[] = [];
  jest.spyOn(sms, 'send').mockImplementation(async (to: string, body: string) => { texts.push({ to, body }); return { sid: 's', to, dev: false }; });
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => user),
      update: jest.fn(async ({ data }: any) => ({ ...user, ...data, roleConfirmed: true, subscription: { plan: 'free' } })),
    },
    loginHistory: { create: jest.fn() },
  };
  const tokens: any = { issue: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })) };
  const svc = new PhoneVerificationService(prisma, fakeCache() as any, sms, tokens);
  const lastCode = () => /Your code is (\d+)\./.exec(texts.at(-1)!.body)![1];
  return { svc, prisma, texts, lastCode };
}

describe('PhoneVerificationService', () => {
  it('texts "Kidora OTP verification" with a 4-digit code', async () => {
    const t = setup();
    const res = await t.svc.send('verify', PHONE);
    expect(res).toMatchObject({ needsPhoneVerification: true, phone: PHONE, maskedPhone: '+2519•••••344', expiresIn: 300, resendIn: 45 });
    expect(t.texts[0].to).toBe(PHONE);
    expect(t.texts[0].body.split('\n')[0]).toBe('Kidora OTP verification');
    expect(t.lastCode()).toMatch(/^\d{4}$/);
    expect(res).not.toHaveProperty('devCode');
  });

  it('normalizes local numbers and rejects nonsense', () => {
    const t = setup();
    expect(t.svc.normalize('0911 22 33 44')).toBe(PHONE);
    expect(() => t.svc.normalize('123')).toThrow(BadRequestException);
  });

  it('verifies the sign-up code once, marks the phone verified and signs in', async () => {
    const t = setup();
    await t.svc.send('verify', PHONE);
    const code = t.lastCode();
    const res = await t.svc.verifySignup(PHONE, code);
    expect(res).toMatchObject({ accessToken: 'a', refreshToken: 'r' });
    expect(t.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phoneVerified: true }) }));
    await expect(t.svc.verifySignup(PHONE, code)).rejects.toThrow('expired'); // single use
  });

  it('allows five wrong guesses, then voids the code', async () => {
    const t = setup();
    await t.svc.send('verify', PHONE);
    const wrong = t.lastCode() === '0000' ? '1111' : '0000';
    for (let i = 0; i < 5; i++) await expect(t.svc.verifySignup(PHONE, wrong)).rejects.toThrow('not right');
    await expect(t.svc.verifySignup(PHONE, wrong)).rejects.toThrow(HttpException);
  });

  it('enforces the resend cooldown', async () => {
    const t = setup();
    await t.svc.send('verify', PHONE);
    await expect(t.svc.send('verify', PHONE)).rejects.toThrow(/wait/);
  });

  it('logs in with a texted code to a verified number', async () => {
    const t = setup({ id: 'u1', active: true, phoneVerified: true, mfaEnabled: false, lockedUntil: null });
    await t.svc.requestLogin(PHONE);
    await expect(t.svc.verifyLogin(PHONE, t.lastCode())).resolves.toMatchObject({ accessToken: 'a' });
  });

  it('answers the same for a number with no account, and texts nothing', async () => {
    const t = setup(null);
    await expect(t.svc.requestLogin(PHONE)).resolves.toMatchObject({ needsPhoneVerification: true, maskedPhone: '+2519•••••344' });
    expect(t.texts).toHaveLength(0);
  });

  it('refuses phone login for accounts that require an authenticator app', async () => {
    const t = setup({ id: 'u1', active: true, phoneVerified: true, mfaEnabled: true, lockedUntil: null });
    await expect(t.svc.verifyLogin(PHONE, '1234')).rejects.toThrow(ForbiddenException);
  });

  it('does not keep a code when the SMS could not be sent', async () => {
    const t = setup();
    (t.svc as any).sms.send = jest.fn(async () => { throw new Error('twilio down'); });
    await expect(t.svc.send('verify', PHONE)).rejects.toThrow('twilio down');
    // No cooldown left behind: an immediate retry is allowed to try again.
    (t.svc as any).sms.send = jest.fn(async () => ({ sid: 's', to: PHONE, dev: false }));
    await expect(t.svc.send('verify', PHONE)).resolves.toMatchObject({ resendIn: 45 });
  });
});
