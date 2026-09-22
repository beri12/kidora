import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { TokenService } from './token.service';
import { E164, PhoneStartDto, PhoneVerifyDto } from '../dto/phone-auth.dto';

const OTP_TTL = 300; // the code is valid for 5 minutes
const RESEND_COOLDOWN = 45; // seconds before "Resend code" works again
const MAX_ATTEMPTS = 5; // wrong codes allowed per issued OTP
const MAX_SENDS_PER_HOUR = 5; // per phone number
const MAX_SENDS_PER_IP_HOUR = 20; // per source IP

/** Nest has no built-in 429 exception, so this is the one-liner equivalent. */
const tooManyRequests = (message: string) =>
  new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

interface OtpRecord {
  hash: string;
  attempts: number;
  issuedAt: number;
}

@Injectable()
export class PhoneAuthService {
  private logger = new Logger('PhoneAuth');

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private sms: SmsService,
    private tokens: TokenService,
  ) {}

  // --- helpers ------------------------------------------------------------

  /** Strips spaces, dashes and brackets, keeps the leading "+". */
  static normalize(raw: string): string {
    const digits = (raw || '').replace(/[^\d+]/g, '');
    const e164 = digits.startsWith('+') ? '+' + digits.slice(1).replace(/\D/g, '') : '+' + digits.replace(/\D/g, '');
    if (!E164.test(e164)) throw new BadRequestException('Enter a valid phone number');
    return e164;
  }

  /** +251911223344 → +2519****344, safe to show in the UI and in logs. */
  static mask(phone: string): string {
    if (phone.length < 7) return phone;
    return phone.slice(0, 5) + '*'.repeat(Math.max(phone.length - 8, 2)) + phone.slice(-3);
  }

  private otpKey(phone: string) { return `otp:phone:${phone}`; }
  private cooldownKey(phone: string) { return `otp:cooldown:${phone}`; }
  private sendCountKey(phone: string) { return `otp:sends:${phone}`; }
  private ipCountKey(ip: string) { return `otp:ip:${ip}`; }

  private sanitize(u: any) {
    const { passwordHash, mfaSecret, backupCodes, ...rest } = u;
    return rest;
  }

  /**
   * Deliver the code, and decide what a failed delivery means.
   *
   * Outside production a refused send must not be the end of the road. A
   * Twilio TRIAL account only texts numbers on its verified list, so every
   * other number answered 503 and phone sign-up could not be exercised at all
   * on a developer's machine — even though the code had been generated and
   * stored. The code is handed back instead, exactly as it is when Twilio is
   * not configured, and the reason is logged.
   *
   * In production the send failing is the whole operation failing: the caller
   * is told, and the stored code is dropped so the next attempt starts clean.
   */
  private async deliver(phone: string, code: string, keysToClear: string[]) {
    const isProd = process.env.NODE_ENV === 'production';
    try {
      await this.sms.sendOtp(phone, code);
    } catch (err) {
      if (isProd) {
        await Promise.all(keysToClear.map((k) => this.cache.del(k)));
        throw err instanceof HttpException
          ? err
          : new ServiceUnavailableException("We couldn't send the code. Check the number and try again.");
      }
      this.logger.error(
        `SMS to ${PhoneAuthService.mask(phone)} was refused, so the code is being returned in the response instead. ` +
        `The reason is logged above by [SMS].`,
      );
      return { devCode: code, smsFailed: true as const };
    }

    // Without Twilio credentials the SMS is only logged, so hand the code back
    // to the caller — that keeps the flow usable in local development. Never
    // in production, whatever the SMS configuration is.
    if (!this.sms.enabled && !isProd) {
      this.logger.warn(`Twilio is not configured — OTP for ${PhoneAuthService.mask(phone)} is ${code}`);
      return { devCode: code, smsFailed: false as const };
    }
    return { devCode: undefined, smsFailed: false as const };
  }

  // --- step 1: send the code ---------------------------------------------

  /**
   * Sends a one-time code by SMS. The response never reveals whether the
   * number already has an account — that would turn this endpoint into a
   * "is this person on Kidora?" oracle. The client shows the same OTP screen
   * either way and only learns which flow it is in after a correct code.
   */
  async start(dto: PhoneStartDto, ip = '') {
    const phone = PhoneAuthService.normalize(dto.phone);

    const cooling = await this.cache.ttl(this.cooldownKey(phone));
    if (cooling > 0) {
      throw tooManyRequests(`Please wait ${cooling}s before requesting another code`);
    }

    const sends = await this.cache.incrWithTtl(this.sendCountKey(phone), 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      throw tooManyRequests('Too many codes requested for this number. Try again later.');
    }
    if (ip) {
      const perIp = await this.cache.incrWithTtl(this.ipCountKey(ip), 3600);
      if (perIp > MAX_SENDS_PER_IP_HOUR) {
        throw tooManyRequests('Too many codes requested. Try again later.');
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const record: OtpRecord = { hash: await bcrypt.hash(code, 10), attempts: 0, issuedAt: Date.now() };
    await this.cache.set(this.otpKey(phone), record, OTP_TTL);
    await this.cache.set(this.cooldownKey(phone), 1, RESEND_COOLDOWN);

    const { devCode, smsFailed } = await this.deliver(phone, code, [
      this.otpKey(phone),
      this.cooldownKey(phone),
    ]);

    return {
      sent: !smsFailed,
      phone: PhoneAuthService.mask(phone),
      expiresIn: OTP_TTL,
      resendIn: RESEND_COOLDOWN,
      ...(devCode ? { devCode } : {}),
      ...(smsFailed ? { smsFailed: true as const } : {}),
    };
  }

  // --- step 2: verify and sign in ----------------------------------------

  /**
   * Verifies the code and signs the user in, creating the account on first
   * use. Returns `isNewUser` / `needsRole` so the web app knows whether to
   * show "How will you use Kidora?" or go straight to the dashboard.
   */
  async verify(dto: PhoneVerifyDto, ip = '', ua = '') {
    const phone = PhoneAuthService.normalize(dto.phone);
    const key = this.otpKey(phone);

    const record = await this.cache.get<OtpRecord>(key);
    if (!record) throw new BadRequestException('That code has expired. Request a new one.');

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.cache.del(key);
      throw tooManyRequests('Too many wrong codes. Request a new one.');
    }

    if (!(await bcrypt.compare(dto.code, record.hash))) {
      const left = OTP_TTL - Math.floor((Date.now() - record.issuedAt) / 1000);
      // Keep the original expiry: a wrong guess must not extend the window.
      await this.cache.set(key, { ...record, attempts: record.attempts + 1 }, Math.max(left, 1));
      throw new BadRequestException('That code is not right. Try again.');
    }

    await this.cache.del(key);
    await this.cache.del(this.sendCountKey(phone));

    let user = await this.prisma.user.findUnique({ where: { phone }, include: { subscription: true } });
    const isNewUser = !user;

    if (!user) {
      const created = await this.prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          name: dto.name?.trim() || 'Kidora member',
          role: (dto.role as Role) ?? Role.PARENT,
          roleConfirmed: Boolean(dto.role),
        },
      });
      await this.prisma.subscription.create({ data: { userId: created.id, plan: 'free' } });
      user = await this.prisma.user.findUnique({ where: { id: created.id }, include: { subscription: true } });
    } else if (!user.phoneVerified || (dto.name && user.name === 'Kidora member')) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, ...(dto.name ? { name: dto.name.trim() } : {}) },
        include: { subscription: true },
      });
    }

    await this.prisma.loginHistory.create({ data: { userId: user!.id, success: true, ip, userAgent: ua } });
    await this.prisma.user.update({ where: { id: user!.id }, data: { failedLogins: 0, lockedUntil: null } });

    const t = await this.tokens.issue(user!);
    return {
      user: this.sanitize({ ...user!, subscriptionPlan: user!.subscription?.plan }),
      ...t,
      isNewUser,
      needsRole: !user!.roleConfirmed,
    };
  }

  // --- the names AuthController uses -------------------------------------
  //
  // Two branches built phone sign-in with different method names against the
  // same idea. These are the other branch's names, wired to the machinery
  // above so there is one implementation, one set of rate limits and one
  // place where codes are hashed — not two that can drift apart.

  /** Passwordless SMS sign-in, step 1. */
  requestLoginCode(rawPhone: string, ip = '') {
    return this.start({ phone: rawPhone }, ip);
  }

  /** Passwordless SMS sign-in, step 2. */
  verifyLoginCode(rawPhone: string, code: string, ip = '', ua = '') {
    return this.verify({ phone: rawPhone, code }, ip, ua);
  }

  /**
   * Attaches a number to an account that already exists, and texts a code to
   * it. Kept under its own cache key so an attach code can never be redeemed
   * as a login code for somebody else's account.
   */
  async requestVerifyCode(userId: string, rawPhone: string) {
    const phone = PhoneAuthService.normalize(rawPhone);

    const owner = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('That mobile number is already on another account.');
    }

    const cooling = await this.cache.ttl(this.attachCooldownKey(userId));
    if (cooling > 0) {
      throw tooManyRequests(`Please wait ${cooling}s before requesting another code`);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const record: OtpRecord = { hash: await bcrypt.hash(code, 10), attempts: 0, issuedAt: Date.now() };
    await this.cache.set(this.attachKey(userId, phone), record, OTP_TTL);
    await this.cache.set(this.attachCooldownKey(userId), 1, RESEND_COOLDOWN);

    const { devCode, smsFailed } = await this.deliver(phone, code, [
      this.attachKey(userId, phone),
      this.attachCooldownKey(userId),
    ]);

    return {
      sent: !smsFailed,
      phone: PhoneAuthService.mask(phone),
      expiresIn: OTP_TTL,
      resendIn: RESEND_COOLDOWN,
      ...(devCode ? { devCode } : {}),
      ...(smsFailed ? { smsFailed: true as const } : {}),
    };
  }

  /** Confirms the number attached above and records it on the account. */
  async confirmPhone(userId: string, rawPhone: string, code: string) {
    const phone = PhoneAuthService.normalize(rawPhone);
    const key = this.attachKey(userId, phone);

    const record = await this.cache.get<OtpRecord>(key);
    if (!record) throw new BadRequestException('That code has expired. Request a new one.');

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.cache.del(key);
      throw tooManyRequests('Too many wrong codes. Request a new one.');
    }

    if (!(await bcrypt.compare(code, record.hash))) {
      const left = OTP_TTL - Math.floor((Date.now() - record.issuedAt) / 1000);
      await this.cache.set(key, { ...record, attempts: record.attempts + 1 }, Math.max(left, 1));
      throw new BadRequestException('That code is not right. Try again.');
    }

    await this.cache.del(key);

    // Checked again here: the number could have been claimed while the code
    // was in flight, and `phone` is unique.
    const owner = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('That mobile number is already on another account.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    });
    return { verified: true, user: this.sanitize(user) };
  }

  private attachKey(userId: string, phone: string) { return `otp:attach:${userId}:${phone}`; }
  private attachCooldownKey(userId: string) { return `otp:attach:cooldown:${userId}`; }
}
