import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { TokenService } from './token.service';
import { exposeOtpForTests, newOtpCode } from './otp-code';

const OTP_TTL = 600; // an email can take a minute to arrive, so 10 minutes
const RESEND_COOLDOWN = 45;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

const tooManyRequests = (message: string) => new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

type Purpose = 'verify' | 'reset';

interface OtpRecord {
  hash: string;
  attempts: number;
  issuedAt: number;
}

/**
 * Email ownership check for accounts created with email + password.
 *
 * Registration creates the account unverified and emails a 6-digit code; no
 * session is issued until the code comes back. The same code is re-sent when
 * an unverified account signs in, so someone who closed the tab half-way can
 * always finish. Codes are hashed at rest, single use, capped at five wrong
 * guesses, and only ever delivered by email.
 */
@Injectable()
export class EmailVerificationService {
  private logger = new Logger('EmailVerify');

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private email: EmailService,
    private tokens: TokenService,
  ) {}

  static normalize(raw: string) {
    return (raw ?? '').trim().toLowerCase();
  }

  /** abebe@example.com → ab***@example.com */
  static mask(email: string) {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.slice(0, Math.min(2, local.length))}${'*'.repeat(3)}@${domain}`;
  }

  /** Verification and password-reset codes live side by side, never shared. */
  private keys(purpose: Purpose, email: string) {
    const p = purpose === 'verify' ? 'otp:email' : 'otp:reset';
    return { code: `${p}:${email}`, cooldown: `${p}:cooldown:${email}`, sends: `${p}:sends:${email}` };
  }

  private sanitize(u: any) {
    const { passwordHash, mfaSecret, backupCodes, subscription, ...rest } = u;
    return { ...rest, subscriptionPlan: subscription?.plan ?? rest.subscriptionPlan };
  }

  /**
   * Emails a fresh email-verification code. Throws 429 inside the resend
   * cooldown or past the hourly cap. `quiet` swallows the cooldown instead —
   * used when sign-in re-sends automatically, where "wait 30s" would be a
   * confusing reply to typing the right password.
   */
  send(rawEmail: string, name: string, opts: { quiet?: boolean } = {}) {
    return this.issueCode('verify', rawEmail, name, opts);
  }

  private async issueCode(purpose: Purpose, rawEmail: string, name: string, opts: { quiet?: boolean } = {}) {
    const email = EmailVerificationService.normalize(rawEmail);
    const k = this.keys(purpose, email);

    const cooling = await this.cache.ttl(k.cooldown);
    if (cooling > 0) {
      if (opts.quiet) return this.pending(email, cooling);
      throw tooManyRequests(`Please wait ${cooling}s before requesting another code`);
    }

    const sends = await this.cache.incrWithTtl(k.sends, 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      if (opts.quiet) return this.pending(email, 0);
      throw tooManyRequests('Too many codes requested for this email. Try again later.');
    }

    const code = newOtpCode();
    const record: OtpRecord = { hash: await bcrypt.hash(code, 10), attempts: 0, issuedAt: Date.now() };
    await this.cache.set(k.code, record, OTP_TTL);
    await this.cache.set(k.cooldown, 1, RESEND_COOLDOWN);

    let dev: boolean;
    try {
      ({ dev } = await this.email.sendVerificationCode(email, name, code, OTP_TTL / 60, purpose));
    } catch (err) {
      await this.cache.del(k.code);
      await this.cache.del(k.cooldown);
      throw err;
    }

    return {
      ...this.pending(email, RESEND_COOLDOWN),
      ...(dev && exposeOtpForTests() ? { devCode: code } : {}),
    };
  }

  /** Single use, five wrong guesses, original expiry kept on a wrong guess. */
  private async checkCode(purpose: Purpose, email: string, code: string) {
    const k = this.keys(purpose, email);
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

  /** What the client needs to render the "check your inbox" step. */
  pending(email: string, resendIn: number) {
    return {
      needsEmailVerification: true as const,
      email,
      maskedEmail: EmailVerificationService.mask(email),
      expiresIn: OTP_TTL,
      resendIn,
    };
  }

  /**
   * "Resend code". Answers the same way whether or not the address belongs to
   * an unverified account, so it cannot be used to probe who is registered.
   */
  async resend(rawEmail: string) {
    const email = EmailVerificationService.normalize(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } });
    if (!user || user.emailVerified) {
      this.logger.log(`Resend requested for an address with nothing to verify (${EmailVerificationService.mask(email)}).`);
      return this.pending(email, RESEND_COOLDOWN);
    }
    return this.send(email, user.name);
  }

  /** Checks the code, marks the address verified and signs the account in. */
  async verify(rawEmail: string, code: string, ip = '', ua = '') {
    const email = EmailVerificationService.normalize(rawEmail);
    await this.checkCode('verify', email, code);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) throw new BadRequestException('That code has expired. Request a new one.');

    const firstTime = !existing.emailVerified;
    const user = await this.prisma.user.update({
      where: { id: existing.id },
      data: { emailVerified: true, failedLogins: 0, lockedUntil: null, lastActiveAt: new Date() },
      include: { subscription: true },
    });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });

    // The welcome email waits until we know the address is real.
    if (firstTime) this.email.sendWelcome(email, user.name);

    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t, needsRole: !user.roleConfirmed };
  }

  // --- forgot / reset password -------------------------------------------

  /**
   * "Forgot password". Emails a reset code when the address belongs to an
   * active account, and answers exactly the same either way, so it cannot be
   * used to find out who has a Kidora account.
   */
  async forgotPassword(rawEmail: string) {
    const email = EmailVerificationService.normalize(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email }, select: { name: true, active: true } });
    if (user?.active) {
      const res = await this.issueCode('reset', email, user.name, { quiet: true });
      return { ...this.resetPending(email), ...('devCode' in res ? { devCode: res.devCode } : {}) };
    }
    this.logger.log(`Password reset requested for an address with no account (${EmailVerificationService.mask(email)}).`);
    return this.resetPending(email);
  }

  private resetPending(email: string) {
    return { sent: true as const, maskedEmail: EmailVerificationService.mask(email), expiresIn: OTP_TTL, resendIn: RESEND_COOLDOWN };
  }

  /**
   * Sets a new password with the emailed reset code, and signs in. Every
   * other session is ended — whoever had the old password is signed out.
   * Receiving the code proves the address too, so it is marked verified.
   */
  async resetPassword(rawEmail: string, code: string, newPassword: string, ip = '', ua = '') {
    const email = EmailVerificationService.normalize(rawEmail);
    await this.checkCode('reset', email, code);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing || !existing.active) throw new BadRequestException('That code has expired. Request a new one.');

    await this.prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
    const user = await this.prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        emailVerified: true,
        failedLogins: 0,
        lockedUntil: null,
        lastActiveAt: new Date(),
      },
      include: { subscription: true },
    });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });

    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t, needsRole: !user.roleConfirmed };
  }
}
