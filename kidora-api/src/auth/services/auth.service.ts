import { ConflictException, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from '../dto/auth.dto';
import { SelectRoleDto } from '../dto/phone-auth.dto';
import { isVerifiedRole } from '../../org/dto/org-request.dto';
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
    // Honour whichever role the form picked, but only from the self-signup
    // allow-list — ADMIN / SUPER_ADMIN / CHILD can never be self-assigned.
    const role = (SELF_SIGNUP_ROLES as readonly Role[]).includes(dto.role as Role) ? (dto.role as Role) : Role.PARENT;
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role, roleConfirmed: true },
    });
    await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });
    if (user.email) this.email.sendWelcome(user.email, user.name);
    const t = await this.tokens.issue(user);
    return { user: this.sanitize(user), ...t };
  }

  /**
   * "How will you use Kidora?" — answered after a phone or social sign-up,
   * where the account starts on the default PARENT role with roleConfirmed
   * false. Only self-signup roles are accepted (the DTO enforces that), and
   * the answer is recorded once so a later call can't silently escalate a
   * confirmed account into another role.
   */
  async selectRole(userId: string, dto: SelectRoleDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new UnauthorizedException('Account not found');
    if (existing.roleConfirmed) throw new ForbiddenException('Role has already been set for this account');

    // School and district roles are administrative: they are never granted by
    // asking. Answering "I'm a School Leader" only says where the applicant is
    // headed — the account keeps its current role, nothing is written, and the
    // client goes on to the verification form, which posts to /org/requests.
    // roleConfirmed stays false so an abandoned application is asked again
    // rather than leaving the account stranded as an unintended parent.
    if (isVerifiedRole(dto.role)) {
      // The name is still worth keeping: a reviewer needs to see who is
      // asking, and a display name carries no privilege of its own.
      const named = dto.name?.trim()
        ? await this.prisma.user.update({ where: { id: userId }, data: { name: dto.name.trim() } })
        : existing;

      return {
        needsVerification: true as const,
        requestedRole: dto.role,
        user: this.sanitize(named),
      };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role as Role,
        roleConfirmed: true,
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
      },
      include: { subscription: true },
    });

    // The role lives inside the JWT, so hand back a fresh pair rather than
    // leaving the client with a token that still says PARENT.
    const t = await this.tokens.issue(user);
    return { user: this.sanitize({ ...user, subscriptionPlan: user.subscription?.plan }), ...t };
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

    // Read the account rather than trusting the token being replaced. Copying
    // the old payload forward meant a role could never change in practice: an
    // approved school leader would have kept refreshing a PARENT token for as
    // long as they stayed signed in, and a disabled account would have kept
    // minting new tokens indefinitely.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!user) throw new UnauthorizedException('Account not found');
    if (!user.active) throw new ForbiddenException('This account is disabled');

    return this.tokens.issue(user);
  }

  async logout(userId: string, jti?: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    if (jti) await this.cache.blacklist(jti, 900);
    return { ok: true };
  }

  /** Roles allowed to see their organisation's join code, i.e. to invite staff. */
  private static readonly CODE_HOLDERS: Role[] = [
    Role.SCHOOL_ADMIN, Role.SCHOOL_LEADER, Role.DISTRICT_ADMIN, Role.ADMIN, Role.SUPER_ADMIN,
  ];

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        // The organisation this account belongs to. Its join code is the
        // thing an approved leader hands to colleagues, so it travels with
        // the profile — but only to the roles entitled to hand it out.
        school: { select: { id: true, name: true, slug: true, joinCode: true } },
        district: { select: { id: true, name: true, joinCode: true } },
        // The newest access request, so the client knows whether to show a
        // dashboard, the "pending approval" screen or the decision.
        orgRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, requestedRole: true, status: true, organizationName: true,
            decisionNote: true, createdAt: true, reviewedAt: true,
          },
        },
      },
    });
    const mayHoldCode = u ? AuthService.CODE_HOLDERS.includes(u.role) : false;
    const strip = <T extends { joinCode?: string | null } | null | undefined>(org: T) =>
      org ? { ...org, joinCode: mayHoldCode ? org.joinCode : undefined } : null;

    return this.sanitize({
      ...u,
      subscriptionPlan: u?.subscription?.plan,
      school: strip(u?.school),
      district: strip(u?.district),
      orgRequest: u?.orgRequests?.[0] ?? null,
      orgRequests: undefined,
    });
  }
}
