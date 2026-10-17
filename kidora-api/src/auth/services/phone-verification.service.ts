import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { TokenService } from './token.service';
import { exposeOtpForTests, newOtpCode } from './otp-code';

/** SMS codes: 4 digits, as people type them from a lock-screen preview. */
export const SMS_CODE_DIGITS = 4;
const OTP_TTL = 300;
const RESEND_COOLDOWN = 45;
// 4 digits is 10,000 codes: five guesses per code and five codes an hour keep
// a brute force at 25 tries an hour, a 0.25% chance.
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

const tooManyRequests = (message: string) => new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

/** What a code is for; each purpose has its own code, never shared. */
export type PhonePurpose = 'verify' | 'login' | 'reset';

interface OtpRecord {
  hash: string;
  attempts: number;
  issuedAt: number;
}

export interface PhonePending {
  needsPhoneVerification: true;
  phone: string;
  /** e.g. "+2519•••••344" */
  maskedPhone: string;
  expiresIn: number;
  resendIn: number;
  devCode?: string;
}

/**
 * The phone number given at sign-up is the account's channel for one-time
 * codes, sent by Twilio SMS as "Kidora OTP verification" with a 4-digit code:
 *
 *   verify — confirms the number right after sign-up (no session until then)
 *   login  — "Log in with phone": a code instead of the password
 *   reset  — "Forgot password" for accounts with a verified number
 *
 * Codes are hashed at rest, single use, expire after 5 minutes and allow five
 * wrong guesses. Answers never reveal whether a number has an account.
 */
@Injectable()
export class PhoneVerificationService {
  private logger = new Logger('PhoneVerify');

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private sms: SmsService,
    private tokens: TokenService,
  ) {}

  /** E.164 (+251911223344), or a 400 the form can show next to the field. */
  normalize(raw: string): string {
    const phone = this.sms.normalize(raw);
    if (!phone) throw new BadRequestException('Enter a valid phone number with its country code, e.g. +251 91 122 3344.');
    return phone;
  }

  /** +251911223344 → +2519•••••344 */
  static mask(phone: string) {
    if (phone.length < 8) return phone;
    return phone.slice(0, 5) + '•'.repeat(Math.max(phone.length - 8, 3)) + phone.slice(-3);
  }

  private keys(purpose: PhonePurpose, phone: string) {
    const p = `otp:phone:${purpose}`;
    return { code: `${p}:${phone}`, cooldown: `${p}:cooldown:${phone}`, sends: `${p}:sends:${phone}` };
  }

  pending(phone: string, resendIn: number): PhonePending {
    return { needsPhoneVerification: true, phone, maskedPhone: PhoneVerificationService.mask(phone), expiresIn: OTP_TTL, resendIn };
  }

  /**
   * Texts a fresh code. Throws 429 inside the resend cooldown or past the
   * hourly cap; `quiet` answers with the pending state instead (used when a
   * code is sent automatically, e.g. on sign-in).
   */
  async send(purpose: PhonePurpose, phone: string, opts: { quiet?: boolean } = {}): Promise<PhonePending> {
    const k = this.keys(purpose, phone);
    const cooling = await this.cache.ttl(k.cooldown);
    if (cooling > 0) {
      if (opts.quiet) return this.pending(phone, cooling);
      throw tooManyRequests(`Please wait ${cooling}s before requesting another code.`);
    }
    const sends = await this.cache.incrWithTtl(k.sends, 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      if (opts.quiet) return this.pending(phone, 0);
      throw tooManyRequests('Too many codes requested for this number. Try again later.');
    }

    const code = newOtpCode(SMS_CODE_DIGITS);
    await this.cache.set(k.code, { hash: await bcrypt.hash(code, 10), attempts: 0, issuedAt: Date.now() } as OtpRecord, OTP_TTL);
    await this.cache.set(k.cooldown, 1, RESEND_COOLDOWN);

    let sent: { dev: boolean };
    try {
      sent = await this.sms.sendOtp(phone, code, OTP_TTL / 60);
    } catch (err) {
      // Nothing was delivered: let the person try again straight away.
      await this.cache.del(k.code);
      await this.cache.del(k.cooldown);
      throw err;
    }
    return { ...this.pending(phone, RESEND_COOLDOWN), ...(sent.dev && exposeOtpForTests() ? { devCode: code } : {}) };
  }

  /** Single use; a wrong guess keeps the original expiry. */
  async checkCode(purpose: PhonePurpose, phone: string, code: string) {
    const k = this.keys(purpose, phone);
    const record = await this.cache.get<OtpRecord>(k.code);
    if (!record) throw new BadRequestException('That code has expired. Request a new one.');
    if (record.attempts >= MAX_ATTEMPTS) {
      await this.cache.del(k.code);
      throw tooManyRequests('Too many wrong codes. Request a new one.');
    }
    if (!(await bcrypt.compare(code, record.hash))) {
      const left = OTP_TTL - Math.floor((Date.now() - record.issuedAt) / 1000);
      await this.cache.set(k.code, { ...record, attempts: record.attempts + 1 }, Math.max(left, 1));
      throw new BadRequestException('That code is not right. Try again.');
    }
    await this.cache.del(k.code);
    await this.cache.del(k.sends);
  }

  private sanitize(u: Record<string, unknown> & { subscription?: { plan?: string } | null }) {
    const { passwordHash: _p, mfaSecret: _m, backupCodes: _b, subscription, ...rest } = u;
    return { ...rest, subscriptionPlan: subscription?.plan ?? rest.subscriptionPlan };
  }

  private async signIn(userId: string, ip: string, ua: string, data: Record<string, unknown> = {}) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLogins: 0, lockedUntil: null, lastActiveAt: new Date(), ...data },
      include: { subscription: true },
    });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });
    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t, needsRole: !user.roleConfirmed };
  }

  // --- sign-up verification ---------------------------------------------

  /** "Resend code" on the sign-up step. Same answer whether or not there is anything to verify. */
  async resendVerification(raw: string) {
    const phone = this.normalize(raw);
    const user = await this.prisma.user.findUnique({ where: { phone }, select: { phoneVerified: true } });
    if (!user || user.phoneVerified) return this.pending(phone, RESEND_COOLDOWN);
    return this.send('verify', phone);
  }

  /** Confirms the number from sign-up and signs the account in. */
  async verifySignup(raw: string, code: string, ip = '', ua = '') {
    const phone = this.normalize(raw);
    await this.checkCode('verify', phone, code);
    const user = await this.prisma.user.findUnique({ where: { phone }, select: { id: true, active: true } });
    if (!user?.active) throw new BadRequestException('That code has expired. Request a new one.');
    return this.signIn(user.id, ip, ua, { phoneVerified: true });
  }

  // --- log in with phone -------------------------------------------------

  /**
   * Texts a sign-in code to a verified number. Answers the same way for a
   * number with no account, so it cannot be used to find who is registered.
   */
  async requestLogin(raw: string) {
    const phone = this.normalize(raw);
    const user = await this.prisma.user.findUnique({ where: { phone }, select: { active: true, phoneVerified: true } });
    if (user?.active) {
      // An unverified number gets a verification code instead: signing in
      // with it finishes the sign-up.
      return this.send(user.phoneVerified ? 'login' : 'verify', phone, { quiet: true });
    }
    this.logger.log(`Phone sign-in requested for a number with no account (${PhoneVerificationService.mask(phone)}).`);
    return this.pending(phone, RESEND_COOLDOWN);
  }

  async verifyLogin(raw: string, code: string, ip = '', ua = '') {
    const phone = this.normalize(raw);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, active: true, phoneVerified: true, mfaEnabled: true, lockedUntil: true },
    });
    if (!user?.active) throw new BadRequestException('That code has expired. Request a new one.');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account locked. Try again later.');
    // A text message must not stand in for an authenticator app the user
    // chose to require.
    if (user.mfaEnabled) {
      throw new ForbiddenException('This account uses an authenticator app. Log in with your email and password.');
    }
    await this.checkCode(user.phoneVerified ? 'login' : 'verify', phone, code);
    return this.signIn(user.id, ip, ua, { phoneVerified: true });
  }
}
