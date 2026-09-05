import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { TokenService } from './token.service';
import { OtpStore } from './otp.store';

const CODE_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Passwordless sign-in by mobile number.
 *
 *   POST /auth/otp/request  { phone }        -> texts a 6-digit code
 *   POST /auth/otp/verify   { phone, code }  -> returns the same token pair as /auth/login
 *
 * The request step returns an identical response whether or not the number is
 * registered, so it can't be used to discover which numbers have accounts.
 */
@Injectable()
export class PhoneAuthService {
  private logger = new Logger('PhoneAuth');

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private tokens: TokenService,
    private store: OtpStore,
  ) {}

  private sanitize(u: any) {
    const { passwordHash, mfaSecret, backupCodes, ...rest } = u;
    return rest;
  }

  /** Rejects anything Twilio would refuse, before we spend an API call on it. */
  private requireE164(raw: string) {
    const phone = this.sms.normalize(raw);
    if (!phone) {
      throw new BadRequestException(
        'Enter a valid mobile number, including the country code (for example +251912345678).',
      );
    }
    return phone;
  }

  private async issueCode(phone: string, purpose: string) {
    const existing = await this.store.get(purpose, phone);
    if (existing && Date.now() - existing.issuedAt < RESEND_COOLDOWN_SECONDS * 1000) {
      throw new HttpException(
        'A code was just sent. Wait a moment before asking for another.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // randomInt is drawn from the CSPRNG; Math.random is predictable enough to
    // be guessable for a credential.
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.store.set(
      purpose,
      phone,
      {
        codeHash: await bcrypt.hash(code, 10),
        attempts: 0,
        issuedAt: Date.now(),
        expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
      },
      CODE_TTL_SECONDS,
    );

    const result = await this.sms.send(phone, `Your Kidora code is ${code}. It expires in 5 minutes.`);

    // Without Twilio credentials the code is only in the server log, so the
    // dev flow needs it echoed back to be testable. Never in production.
    const devCode = result.dev && process.env.NODE_ENV !== 'production' ? code : undefined;
    return { expiresIn: CODE_TTL_SECONDS, ...(devCode ? { devCode } : {}) };
  }

  private async consumeCode(phone: string, code: string, purpose: string) {
    const record = await this.store.get(purpose, phone);
    if (!record) throw new UnauthorizedException('That code has expired. Request a new one.');

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.store.del(purpose, phone);
      throw new UnauthorizedException('Too many incorrect attempts. Request a new code.');
    }

    if (!(await bcrypt.compare(code, record.codeHash))) {
      // Burn an attempt, keeping the original expiry so a wrong guess can't
      // extend the code's lifetime.
      const remainingMs = record.expiresAt - Date.now();
      await this.store.set(
        purpose,
        phone,
        { ...record, attempts: record.attempts + 1 },
        Math.max(1, Math.ceil(remainingMs / 1000)),
      );
      throw new UnauthorizedException('That code is not correct.');
    }

    await this.store.del(purpose, phone);
  }

  /** Step 1 — send a login code. Silent when the number has no account. */
  async requestLoginCode(rawPhone: string) {
    const phone = this.requireE164(rawPhone);
    const user = await this.prisma.user.findUnique({ where: { phone }, select: { id: true, active: true } });

    if (!user || !user.active) {
      this.logger.log(`OTP requested for unregistered number ${phone} — responding as if sent.`);
      return { sent: true, expiresIn: CODE_TTL_SECONDS };
    }

    return { sent: true, ...(await this.issueCode(phone, 'login')) };
  }

  /** Step 2 — exchange a valid code for a session. */
  async verifyLoginCode(rawPhone: string, code: string, ip = '', ua = '') {
    const phone = this.requireE164(rawPhone);
    await this.consumeCode(phone, code, 'login');

    const user = await this.prisma.user.findUnique({ where: { phone }, include: { subscription: true } });
    if (!user || !user.active) throw new UnauthorizedException('That number is no longer active.');

    // A successful SMS round-trip proves the number, and clears any lockout
    // accumulated by password guesses.
    const fresh = await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, failedLogins: 0, lockedUntil: null, lastActiveAt: new Date() },
    });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });

    const t = await this.tokens.issue(fresh);
    return { user: this.sanitize({ ...fresh, subscriptionPlan: user.subscription?.plan }), ...t };
  }

  /** Attach a number to the signed-in account and text a confirmation code. */
  async requestVerifyCode(userId: string, rawPhone: string) {
    const phone = this.requireE164(rawPhone);

    const owner = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (owner && owner.id !== userId) throw new ConflictException('That number is already on another account.');

    await this.prisma.user.update({ where: { id: userId }, data: { phone, phoneVerified: false } });
    return { sent: true, ...(await this.issueCode(phone, 'verify')) };
  }

  /** Confirm the number attached above. */
  async confirmPhone(userId: string, rawPhone: string, code: string) {
    const phone = this.requireE164(rawPhone);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (user?.phone !== phone) throw new BadRequestException('That number is not pending verification on this account.');

    await this.consumeCode(phone, code, 'verify');
    await this.prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } });
    return { verified: true, phone };
  }
}
