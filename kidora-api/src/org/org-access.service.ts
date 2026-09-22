import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OrgRequestStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';
import { SmsService } from '../infrastructure/sms/sms.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { SubmitOrgRequestDto, VerifiedRole } from './dto/org-request.dto';

/** Statuses that still count as "this person is waiting on us". */
const OPEN: OrgRequestStatus[] = [OrgRequestStatus.PENDING, OrgRequestStatus.CHANGES_REQUESTED];

/** What the applicant is allowed to see about their own request. */
const APPLICANT_VIEW = {
  id: true,
  requestedRole: true,
  status: true,
  organizationName: true,
  jobTitle: true,
  country: true,
  region: true,
  website: true,
  workEmail: true,
  contactPhone: true,
  studentCount: true,
  evidenceUrl: true,
  note: true,
  decisionNote: true,
  autoApproved: true,
  schoolId: true,
  districtId: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
} satisfies Prisma.OrgAccessRequestSelect;

@Injectable()
export class OrgAccessService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private sms: SmsService,
    private cache: CacheService,
  ) {}

  // --- codes -------------------------------------------------------------

  /** Skips look-alike characters (0/O, 1/I) so a code survives being read aloud. */
  private code(len = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(randomBytes(len)).map((b) => alphabet[b % alphabet.length]).join('');
  }

  private async uniqueCode(tx: Prisma.TransactionClient, kind: 'school' | 'district') {
    for (let i = 0; i < 10; i++) {
      const c = this.code();
      const taken =
        kind === 'school'
          ? await tx.school.findUnique({ where: { joinCode: c }, select: { id: true } })
          : await tx.district.findUnique({ where: { joinCode: c }, select: { id: true } });
      if (!taken) return c;
    }
    return this.code(10);
  }

  private slugify(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base = this.slugify(name) || 'school';
    for (let i = 0; i < 20; i++) {
      const slug = i === 0 ? base : `${base}-${i}`;
      if (!(await tx.school.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    }
    return `${base}-${this.code(4).toLowerCase()}`;
  }

  private isDistrictRole(role: Role) {
    return role === Role.DISTRICT_ADMIN;
  }

  // --- submit ------------------------------------------------------------

  /**
   * Records a claim to an administrative role. The role itself is NOT granted
   * here — `user.role` is untouched unless a join code proves the organisation
   * already knows this person.
   */
  async submit(userId: string, dto: SubmitOrgRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, roleConfirmed: true },
    });
    if (!user) throw new NotFoundException('Account not found');

    // An account that already holds a confirmed role does not apply again;
    // changing an established role is an admin action, not a self-service one.
    if (user.roleConfirmed && user.role !== Role.PARENT) {
      throw new ForbiddenException('This account already has a role. Contact support to change it.');
    }

    const open = await this.prisma.orgAccessRequest.findFirst({
      where: { userId, status: { in: OPEN } },
      select: { id: true, status: true },
    });
    if (open) {
      throw new ConflictException('You already have a request waiting on us.');
    }

    const code = dto.joinCode?.trim().toUpperCase();
    const invite = code ? await this.resolveJoinCode(code, dto.requestedRole) : null;

    // With a valid code the organisation has already vouched for the person,
    // so the request is created and approved in the same transaction.
    if (invite) {
      return this.prisma.$transaction(async (tx) => {
        const request = await tx.orgAccessRequest.create({
          data: {
            ...this.requestData(userId, dto),
            schoolId: invite.schoolId,
            districtId: invite.districtId,
            status: OrgRequestStatus.APPROVED,
            autoApproved: true,
            reviewedAt: new Date(),
            decisionNote: 'Approved automatically with a valid organisation code.',
          },
          select: APPLICANT_VIEW,
        });
        await this.grant(tx, userId, dto.requestedRole, invite);
        await this.notify(tx, userId, user, 'approved', dto.requestedRole, dto.organizationName);
        return { status: 'APPROVED' as const, request, roleGranted: true };
      });
    }

    if (code) {
      // They typed a code and it did not match. Saying so is better than
      // silently dropping them into a queue they did not choose.
      throw new BadRequestException('That organisation code is not valid.');
    }

    const request = await this.prisma.orgAccessRequest.create({
      data: this.requestData(userId, dto),
      select: APPLICANT_VIEW,
    });

    // The question has been answered even though the role is not granted yet,
    // so the "How will you use Kidora?" step does not come back on next login.
    await this.prisma.user.update({ where: { id: userId }, data: { roleConfirmed: true } });
    await this.notify(this.prisma, userId, user, 'submitted', dto.requestedRole, dto.organizationName);

    return { status: 'PENDING' as const, request, roleGranted: false };
  }

  private requestData(userId: string, dto: SubmitOrgRequestDto) {
    return {
      userId,
      requestedRole: dto.requestedRole as Role,
      organizationName: dto.organizationName.trim(),
      jobTitle: dto.jobTitle.trim(),
      country: dto.country?.trim() || null,
      region: dto.region?.trim() || null,
      website: dto.website?.trim() || null,
      workEmail: dto.workEmail?.trim().toLowerCase() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      studentCount: dto.studentCount ?? null,
      evidenceUrl: dto.evidenceUrl?.trim() || null,
      note: dto.note?.trim() || null,
    };
  }

  /** Matches a code to a school or a district, and checks it fits the role asked for. */
  private async resolveJoinCode(code: string, requestedRole: VerifiedRole) {
    if (this.isDistrictRole(requestedRole as Role)) {
      const district = await this.prisma.district.findUnique({ where: { joinCode: code }, select: { id: true } });
      return district ? { schoolId: null, districtId: district.id } : null;
    }
    const school = await this.prisma.school.findUnique({
      where: { joinCode: code },
      select: { id: true, active: true, districtId: true },
    });
    if (!school) return null;
    if (!school.active) throw new ConflictException('That organisation is not accepting new members.');
    return { schoolId: school.id, districtId: school.districtId };
  }

  // --- read --------------------------------------------------------------

  /** The applicant's own view, used by the "pending approval" screen. */
  async mine(userId: string) {
    return this.prisma.orgAccessRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: APPLICANT_VIEW,
    });
  }

  /** Review queue. Oldest first: whoever has waited longest is seen first. */
  async list(status: OrgRequestStatus | 'OPEN' = 'OPEN', take = 25, skip = 0) {
    const where: Prisma.OrgAccessRequestWhereInput =
      status === 'OPEN' ? { status: { in: OPEN } } : { status };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.orgAccessRequest.count({ where }),
      this.prisma.orgAccessRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: Math.min(take, 100),
        skip,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
    ]);
    return { total, items };
  }

  // --- decisions ---------------------------------------------------------

  /**
   * Approves a request: creates or links the organisation, writes the role
   * onto the account, and records who decided. This is the only path by which
   * an administrative role is ever granted.
   */
  async approve(requestId: string, reviewerId: string, decisionNote?: string, ip = '') {
    const request = await this.prisma.orgAccessRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!OPEN.includes(request.status)) {
      throw new ConflictException(`That request was already ${request.status.toLowerCase()}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const target = request.schoolId || request.districtId
        ? { schoolId: request.schoolId, districtId: request.districtId }
        : await this.createOrganisation(tx, request.requestedRole, request);

      await this.grant(tx, request.userId, request.requestedRole as VerifiedRole, target);

      const updated = await tx.orgAccessRequest.update({
        where: { id: requestId },
        data: {
          status: OrgRequestStatus.APPROVED,
          schoolId: target.schoolId,
          districtId: target.districtId,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          decisionNote: decisionNote?.trim() || null,
        },
        select: APPLICANT_VIEW,
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          schoolId: target.schoolId,
          action: 'org.request.approve',
          entityType: 'OrgAccessRequest',
          entityId: requestId,
          before: { status: request.status },
          after: { status: OrgRequestStatus.APPROVED, role: request.requestedRole },
          ip,
        },
      });

      await this.notify(tx, request.userId, request.user, 'approved', request.requestedRole, request.organizationName);
      return updated;
    });
  }

  /** Refuses a request. The note is required — a bare "no" helps nobody. */
  async reject(requestId: string, reviewerId: string, decisionNote: string, ip = '') {
    if (!decisionNote?.trim()) {
      throw new BadRequestException('Say why, so the applicant knows what to do next.');
    }
    return this.decide(requestId, reviewerId, OrgRequestStatus.REJECTED, decisionNote, ip);
  }

  /** Asks for more evidence. The request stays open and the applicant can resubmit. */
  async requestChanges(requestId: string, reviewerId: string, decisionNote: string, ip = '') {
    if (!decisionNote?.trim()) {
      throw new BadRequestException('Say what is missing, so the applicant can supply it.');
    }
    return this.decide(requestId, reviewerId, OrgRequestStatus.CHANGES_REQUESTED, decisionNote, ip);
  }

  private async decide(
    requestId: string,
    reviewerId: string,
    status: OrgRequestStatus,
    decisionNote: string,
    ip: string,
  ) {
    const request = await this.prisma.orgAccessRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!OPEN.includes(request.status)) {
      throw new ConflictException(`That request was already ${request.status.toLowerCase()}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orgAccessRequest.update({
        where: { id: requestId },
        data: {
          status,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          decisionNote: decisionNote.trim(),
        },
        select: APPLICANT_VIEW,
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: status === OrgRequestStatus.REJECTED ? 'org.request.reject' : 'org.request.changes',
          entityType: 'OrgAccessRequest',
          entityId: requestId,
          before: { status: request.status },
          after: { status },
          ip,
        },
      });

      await this.notify(
        tx,
        request.userId,
        request.user,
        status === OrgRequestStatus.REJECTED ? 'rejected' : 'changes',
        request.requestedRole,
        request.organizationName,
        decisionNote,
      );
      return updated;
    });
  }

  // --- granting ----------------------------------------------------------

  /**
   * Writes the administrative role onto the account.
   *
   * Existing access tokens still carry the old role until they expire, which
   * is why AuthService.refresh reads the role from the database rather than
   * from the token it is replacing — one refresh and the new permissions are
   * live.
   */
  private async grant(
    tx: Prisma.TransactionClient,
    userId: string,
    role: VerifiedRole | Role,
    target: { schoolId: string | null; districtId: string | null },
  ) {
    await tx.user.update({
      where: { id: userId },
      data: {
        role: role as Role,
        roleConfirmed: true,
        schoolId: target.schoolId,
        districtId: target.districtId,
      },
    });

    // All three of these fields are cached by JwtStrategy for a minute. Until
    // the cache is dropped, a just-approved leader is still read as a PARENT
    // with no school, so the dashboard they were sent to answers 403.
    await this.cache.bustTenancy(userId);
  }

  /** Creates the school or district an approved request described. */
  private async createOrganisation(
    tx: Prisma.TransactionClient,
    role: Role,
    request: { organizationName: string; country: string | null; region: string | null },
  ) {
    if (this.isDistrictRole(role)) {
      const district = await tx.district.create({
        data: {
          name: request.organizationName,
          region: request.region ?? '',
          joinCode: await this.uniqueCode(tx, 'district'),
        },
      });
      return { schoolId: null, districtId: district.id };
    }

    const school = await tx.school.create({
      data: {
        name: request.organizationName,
        country: request.country,
        slug: await this.uniqueSlug(tx, request.organizationName),
        joinCode: await this.uniqueCode(tx, 'school'),
        settings: { create: {} },
      },
    });

    // Grades 1-8 so classes can be created straight away; safe to delete.
    await tx.grade.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({ schoolId: school.id, level: i + 1, name: `Grade ${i + 1}` })),
      skipDuplicates: true,
    });

    return { schoolId: school.id, districtId: null };
  }

  // --- telling the applicant --------------------------------------------

  private async notify(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    user: { name: string; email: string | null; phone: string | null },
    event: 'submitted' | 'approved' | 'rejected' | 'changes',
    role: Role,
    organizationName: string,
    decisionNote?: string,
  ) {
    const label = role === Role.DISTRICT_ADMIN ? 'district' : 'school';

    const copy = {
      submitted: {
        title: 'We are checking your request ⏳',
        body: `Thanks — we are verifying that you lead ${organizationName}. Most requests are reviewed within two working days.`,
      },
      approved: {
        title: 'You are approved 🎉',
        body: `Your ${label} access to ${organizationName} is active. Sign in again to open your dashboard.`,
      },
      rejected: {
        title: 'We could not verify your request',
        body: decisionNote ?? `We could not confirm your role at ${organizationName}.`,
      },
      changes: {
        title: 'We need a little more',
        body: decisionNote ?? `We need more detail before approving your access to ${organizationName}.`,
      },
    }[event];

    await db.notification.create({
      data: { userId, title: copy.title, body: copy.body, link: '/pending', meta: { organizationName, role } },
    });

    // Best effort: a failed email or SMS must never roll back a decision.
    try {
      if (user.email) await this.email.sendOrgRequestUpdate(user.email, user.name, copy.title, copy.body);
      else if (user.phone && event !== 'submitted') await this.sms.send(user.phone, `Kidora: ${copy.title} — ${copy.body}`);
    } catch {
      // Swallowed on purpose; the in-app notification above is the record.
    }
  }
}
