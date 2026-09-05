import { ConflictException, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TokenService } from '../services/token.service';
import { MfaService } from '../services/mfa.service';
import { RegistrationService } from '../services/registeration.service';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from '../dto/auth.dto';
import { PlanKey, Role } from '@prisma/client';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/** Org accounts land on the matching plan; everyone else starts free. */
const PLAN_FOR_ROLE: Partial<Record<Role, PlanKey>> = {
  [Role.SCHOOL_ADMIN]: PlanKey.school,
  [Role.SCHOOL_LEADER]: PlanKey.school,
  [Role.DISTRICT_ADMIN]: PlanKey.district,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokens: TokenService,
    private mfa: MfaService,
    private email: EmailService,
    private cache: CacheService,
    private registration: RegistrationService,
  ) {}

  private sanitize(u: any) { const { passwordHash, mfaSecret, backupCodes, ...rest } = u; return rest; }

  async register(dto: RegisterDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException('Email already registered');

    // Allow-list, not a two-way switch: anything not on the signup list (ADMIN,
    // SUPER_ADMIN, CHILD) falls back to PARENT, so a crafted body can never
    // create a privileged account.
    const role: Role = (SELF_SIGNUP_ROLES as readonly Role[]).includes(dto.role as Role) ? (dto.role as Role) : Role.PARENT;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role },
      select: { id: true, name: true, role: true, schoolId: true },
    });

    // Creates the School (slug, join code, grades, settings) for SCHOOL_ADMIN /
    // SCHOOL_LEADER, the District for DISTRICT_ADMIN, or joins an existing
    // school via schoolCode for TEACHER. Returns the user with schoolId set.
    // If it throws, the half-made account would be orphaned, so remove it.
    let user;
    try {
      user = await this.registration.applyProfile(created, dto);
    } catch (e) {
      await this.prisma.user.delete({ where: { id: created.id } }).catch(() => undefined);
      throw e;
    }

    await this.prisma.subscription.create({ data: { userId: user.id, plan: PLAN_FOR_ROLE[role] ?? PlanKey.free } });
    this.email.sendWelcome(user.email, user.name);

    // Issued after applyProfile so the JWT carries the real schoolId — the
    // guards and tenancy checks read it straight off the token.
    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t };
  }

  async login(dto: LoginDto, ip = '', ua = '') {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { subscription: true } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account locked. Try again later.');
    if (!user.active) throw new ForbiddenException('This account has been deactivated.');

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

    // lastActiveAt feeds the "At Risk / Needs Support" rules on the school and
    // teacher dashboards, so it is refreshed on every successful login.
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastActiveAt: new Date() } });
    await this.prisma.loginHistory.create({ data: { userId: user.id, success: true, ip, userAgent: ua } });
    const t = await this.tokens.issue(user);
    return { user: this.sanitize({ ...user, subscription: undefined, subscriptionPlan: user.subscription?.plan }), ...t };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.tokens.verifyRefresh(refreshToken); } catch { throw new UnauthorizedException('Invalid refresh token'); }
    const stored = await this.prisma.refreshToken.findMany({ where: { userId: payload.sub } });
    const matches = await Promise.all(stored.map((s) => bcrypt.compare(refreshToken, s.tokenHash)));
    if (!matches.some(Boolean)) throw new UnauthorizedException('Refresh token revoked');
    // Re-read the user so a role or school change since the last login is
    // reflected in the new access token instead of being carried over.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true, schoolId: true, active: true } });
    if (!user || !user.active) throw new UnauthorizedException('Account unavailable');
    return this.tokens.issue(user);
  }

  async logout(userId: string, jti?: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    if (jti) await this.cache.blacklist(jti, 900);
    return { ok: true };
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, school: { select: { id: true, name: true, joinCode: true, plan: true } }, grade: { select: { id: true, name: true } } },
    });
    if (!u) throw new UnauthorizedException('Account not found');
    return this.sanitize({ ...u, subscription: undefined, subscriptionPlan: u.subscription?.plan });
  }
}