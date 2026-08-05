import { ConflictException, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { Role } from '@prisma/client';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokens: TokenService,
    private mfa: MfaService,
    private email: EmailService,
    private cache: CacheService,
  ) {}

  private sanitize(u: any) { const { passwordHash, mfaSecret, backupCodes, ...rest } = u; return rest; }

  async register(dto: RegisterDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role === Role.TEACHER ? Role.TEACHER : Role.PARENT; // never self-register as ADMIN
    const user = await this.prisma.user.create({ data: { name: dto.name, email: dto.email, passwordHash, role } });
    await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });
    this.email.sendWelcome(user.email, user.name);
    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t };
  }

  async login(dto: LoginDto, ip = '', ua = '') {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { subscription: true } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account locked. Try again later.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLogins + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null } });
      await this.prisma.loginHistory.create({ data: { userId: user.id, success: false, ip, userAgent: ua } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // MFA challenge
    if (user.mfaEnabled) {
      if (!dto.mfaCode) throw new UnauthorizedException('MFA_REQUIRED');
      if (!this.mfa.verify(user.mfaSecret!, dto.mfaCode)) throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });
    const t = await this.tokens.issue(user);
    return { user: this.sanitize({ ...user, subscriptionPlan: user.subscription?.plan }), ...t };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.tokens.verifyRefresh(refreshToken); } catch { throw new UnauthorizedException('Invalid refresh token'); }
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
    return this.sanitize({ ...u, subscriptionPlan: u?.subscription?.plan });
  }
}
