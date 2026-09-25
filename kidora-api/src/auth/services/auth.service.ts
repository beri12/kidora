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
import { SmsService } from '../../infrastructure/sms/sms.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from '../dto/auth.dto';
import { SelectRoleDto } from '../dto/phone-auth.dto';
import { isVerifiedRole } from '../../org/dto/org-request.dto';
import { RegistrationService } from './registeration.service';
import { EmailVerificationService } from './email-verification.service';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokens: TokenService,
    private mfa: MfaService,
    private sms: SmsService,
    private cache: CacheService,
    private registration: RegistrationService,
    private emailVerification: EmailVerificationService,
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

  /**
   * Creates the account and emails a 6-digit code to the address. No session
   * is issued here: POST /auth/email/verify returns the tokens once the code
   * comes back, so an account can never be used from an address nobody owns.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) {
      // Someone who registered, closed the tab and is trying again with the
      // same details should simply get a new code, not a dead end.
      if (!taken.emailVerified && taken.passwordHash && (await bcrypt.compare(dto.password, taken.passwordHash))) {
        return this.emailVerification.send(email, taken.name, { quiet: true });
      }
      throw new ConflictException('An account with this email already exists. Sign in instead.');
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
      data: {
        name: dto.name.trim(),
        email,
        phone,
        passwordHash,
        role,
        emailVerified: false,
        // A role picked on the sign-up form is an answer to "How will you use
        // Kidora?"; without one the question is asked after verification.
        roleConfirmed: Boolean(dto.role),
      },
    });

    // Role-specific setup: creates the school (with grades and a join code) or
    // district, resolves a school join code, opens a reward wallet for a child.
    // If it fails the half-made account would strand the email address, so it
    // is rolled back and the caller can simply try again.
    try {
      await this.registration.applyProfile(user, dto);
    } catch (err) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw err;
    }

    await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });

    try {
      return await this.emailVerification.send(email, user.name);
    } catch (err) {
      // The address could not be reached at all, so the account is removed
      // rather than left holding an email nobody can verify.
      await this.prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw err;
    }
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

    // A student or teacher can bring a school join code (and a student a
    // grade). This is the same setup email registration runs — reward wallet,
    // school membership, class grade — so a student who signed up with a
    // phone number or Google lands in exactly the same place. It runs first:
    // a bad school code must leave the account unanswered, not half-made.
    if (dto.role === Role.CHILD || dto.role === Role.TEACHER) {
      await this.registration.applyProfile(
        { id: userId, name: dto.name?.trim() || existing.name, role: dto.role, schoolId: existing.schoolId },
        dto,
      );
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

    // JwtStrategy reads role and tenancy from the database but caches them for
    // a minute, so without this the account keeps being treated as a PARENT
    // right after answering — a teacher who picks "I'm a Teacher" is refused
    // from /teacher/* with a 403 until the TTL runs out.
    await this.cache.bustTenancy(userId);

    // The role lives inside the JWT, so hand back a fresh pair rather than
    // leaving the client with a token that still says PARENT.
    const t = await this.tokens.issue(user);
    return { user: this.sanitize({ ...user, subscriptionPlan: user.subscription?.plan }), ...t };
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

    // The password is right but the address was never confirmed: send a fresh
    // code and tell the client to show the code step. Checked after the
    // password so it reveals nothing to someone who doesn't know it.
    if (user.email && !user.emailVerified) {
      const pending = await this.emailVerification.send(user.email, user.name, { quiet: true });
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email. We sent a new code to your inbox.',
        ...pending,
      });
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
    const userId = await this.tokens.consumeRefresh(refreshToken, payload);
    if (!userId) throw new UnauthorizedException('Refresh token revoked');

    // Read the account rather than trusting the token being replaced. Copying
    // the old payload forward meant a role could never change in practice: an
    // approved school leader would have kept refreshing a PARENT token for as
    // long as they stayed signed in, and a disabled account would have kept
    // minting new tokens indefinitely.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
