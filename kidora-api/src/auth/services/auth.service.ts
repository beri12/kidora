import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { RegistrationService } from './registeration.service';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from '../dto/auth.dto';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokens: TokenService,
    private mfa: MfaService,
    private email: EmailService,
    private sms: SmsService,
    private cache: CacheService,
    private registration: RegistrationService,
  ) {}

  private sanitize(u: any) {
    const { passwordHash, mfaSecret, backupCodes, ...rest } = u;
    return rest;
  }

  /**
   * The role the account is actually created with.
   *
   * ADMIN and SUPER_ADMIN are not in SELF_SIGNUP_ROLES, so a request asking for
   * one falls back to PARENT rather than being honoured — self-registration can
   * never mint an administrator. Every other role the signup UI offers
   * (including SCHOOL_ADMIN and DISTRICT_ADMIN) is stored as chosen, which is
   * what makes the school/district onboarding below run.
   */
  private resolveRole(requested?: string): Role {
    return (SELF_SIGNUP_ROLES as readonly Role[]).includes(requested as Role)
      ? (requested as Role)
      : Role.PARENT;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email already registered');
    }

    // Normalised up front so the uniqueness check and the stored value agree,
    // and so SMS login later finds the account by the same string Twilio uses.
    let phone: string | null = null;
    if (dto.phone?.trim()) {
      phone = this.sms.normalize(dto.phone);
      if (!phone) {
        throw new BadRequestException(
          'Enter a valid mobile number, including the country code (for example +251912345678).',
        );
      }
      if (await this.prisma.user.findUnique({ where: { phone } })) {
        throw new ConflictException('That mobile number is already registered');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = this.resolveRole(dto.role);

    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, phone, passwordHash, role },
    });

    // Role-specific setup: creates the school (with grades and a join code) or
    // district, resolves a school join code, opens a reward wallet for a child.
    // If it fails the half-made account would strand the email address, so it
    // is rolled back and the caller can simply try again.
    let profiled = user;
    try {
      profiled = await this.registration.applyProfile(user, dto);
    } catch (err) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw err;
    }

    await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });
    this.email.sendWelcome(profiled.email, profiled.name);

    const t = await this.tokens.issue(profiled);
    return { user: this.sanitize({ ...profiled, subscriptionPlan: 'free' }), ...t };
  }

  async login(dto: LoginDto, ip = '', ua = '') {
    // The login form accepts either identifier; whichever arrived is what we
    // look the account up by.
    let where: Prisma.UserWhereUniqueInput;
    if (dto.email) {
      where = { email: dto.email.trim().toLowerCase() };
    } else if (dto.phone) {
      const phone = this.sms.normalize(dto.phone);
      if (!phone) throw new UnauthorizedException('Invalid credentials');
      where = { phone };
    } else {
      throw new BadRequestException('Enter your email address or mobile number.');
    }

    const user = await this.prisma.user.findUnique({ where, include: { subscription: true } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account locked. Try again later.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLogins + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
        },
      });
      await this.prisma.loginHistory.create({ data: { userId: user.id, success: false, ip, userAgent: ua } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // MFA challenge
    if (user.mfaEnabled) {
      if (!dto.mfaCode) throw new UnauthorizedException('MFA_REQUIRED');
      if (!this.mfa.verify(user.mfaSecret!, dto.mfaCode)) throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastActiveAt: new Date() },
    });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });
    const t = await this.tokens.issue(user);
    return { user: this.sanitize({ ...user, subscription: undefined, subscriptionPlan: user.subscription?.plan }), ...t };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const stored = await this.prisma.refreshToken.findMany({ where: { userId: payload.sub } });
    const matches = await Promise.all(stored.map((s) => bcrypt.compare(refreshToken, s.tokenHash)));
    if (!matches.some(Boolean)) throw new UnauthorizedException('Refresh token revoked');
    return this.tokens.issue({ id: payload.sub, email: payload.email, role: payload.role });
  }

  async logout(userId: string, jti?: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    if (jti) await this.cache.blacklist(jti, 900);
    return { ok: true };
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
    return this.sanitize({ ...u, subscription: undefined, subscriptionPlan: u?.subscription?.plan });
  }
}
