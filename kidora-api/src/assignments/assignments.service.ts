import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseAccessService } from '../courses/course-access.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AuditService } from '../common/services/audit.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateAssignmentDto,
  GradeAssignmentDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

const STUDENT_SELECT = { id: true, name: true, avatarColor: true, avatarUrl: true } as const;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly audit: AuditService,
    private readonly rewards: RewardsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- teacher

  async create(tenant: TenantContext, dto: CreateAssignmentDto) {
    await this.access.assertCanEdit(tenant, dto.courseId);
    return this.prisma.assignment.create({
      data: {
        courseId: dto.courseId,
        sectionId: dto.sectionId ?? null,
        lessonId: dto.lessonId ?? null,
        teacherId: tenant.userId,
        title: dto.title,
        instructions: dto.instructions ?? '',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        points: dto.points ?? 100,
        submissionTypes: dto.submissionTypes ?? ['TEXT'],
        attachmentUrls: dto.attachmentUrls ?? [],
        rubric: (dto.rubric ?? undefined) as any,
        published: dto.published ?? false,
      },
    });
  }

  async update(tenant: TenantContext, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.assertCanManage(tenant, id);
    return this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        points: dto.points,
        submissionTypes: dto.submissionTypes,
        attachmentUrls: dto.attachmentUrls,
        rubric: dto.rubric as any,
        published: dto.published,
      },
    });
  }

  async remove(tenant: TenantContext, id: string) {
    const assignment = await this.assertCanManage(tenant, id);
    const submissions = await this.prisma.assignmentSubmission.count({
      where: { assignmentId: assignment.id },
    });
    if (submissions > 0) {
      throw new ForbiddenException(
        'Students have already submitted work. Unpublish the assignment instead of deleting it.',
      );
    }
    await this.prisma.assignment.delete({ where: { id: assignment.id } });
    return { ok: true };
  }

  /** Assignments the signed-in teacher owns, newest first. */
  listForTeacher(tenant: TenantContext, courseId?: string) {
    return this.prisma.assignment.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(tenant.isPlatformAdmin
          ? {}
          : { OR: [{ teacherId: tenant.userId }, { course: { schoolId: tenant.schoolId ?? '__none__' } }] }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  async submissions(tenant: TenantContext, id: string) {
    const assignment = await this.assertCanManage(tenant, id);
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { submittedAt: 'desc' },
      include: { student: { select: STUDENT_SELECT } },
    });
  }

  /**
   * Grade a submission. The score is clamped to the assignment's own points, so
   * a teacher cannot award more than the assignment is worth and a crafted
   * value cannot inflate a student's record.
   */
  async grade(tenant: TenantContext, submissionId: string, dto: GradeAssignmentDto) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.assertCanManage(tenant, submission.assignmentId);

    const score = Math.max(0, Math.min(Math.round(dto.score), submission.assignment.points));
    const status = dto.returnForRevision ? 'RETURNED' : 'GRADED';

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: dto.feedback ?? null,
        status,
        gradedById: tenant.userId,
        gradedAt: new Date(),
      },
    });

    await this.audit.record({
      actorId: tenant.userId, schoolId: tenant.schoolId, action: 'assignment.grade',
      entity: 'AssignmentSubmission', entityId: submissionId,
      meta: { score, status, assignmentId: submission.assignmentId },
    });

    if (status === 'GRADED') {
      await this.rewards.awardXp(submission.studentId, 'ASSIGNMENT_GRADED', {
        refType: 'assignment', refId: submission.assignmentId,
        description: submission.assignment.title,
      });
      await this.notifications.create(
        submission.studentId,
        '📝 Assignment graded',
        `"${submission.assignment.title}" — ${score}/${submission.assignment.points}`,
      );
    } else {
      await this.notifications.create(
        submission.studentId,
        '↩️ Assignment returned',
        `Your teacher sent "${submission.assignment.title}" back with feedback.`,
      );
    }
    return updated;
  }

  // ---------------------------------------------------------------- student

  /** Assignments visible to a learner in a course they may open. */
  async listForStudent(tenant: TenantContext, courseId?: string) {
    const courses = courseId
      ? [(await this.access.assertCanLearn(tenant, courseId)).id]
      : (
          await this.prisma.course.findMany({
            where: this.access.learnerFilter(tenant),
            select: { id: true },
            take: 200,
          })
        ).map((c) => c.id);

    return this.prisma.assignment.findMany({
      where: { courseId: { in: courses }, published: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        course: { select: { id: true, title: true } },
        submissions: {
          where: { studentId: tenant.userId },
          select: { id: true, status: true, score: true, feedback: true, submittedAt: true },
        },
      },
    });
  }

  async one(tenant: TenantContext, id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { course: { select: { id: true, title: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.access.assertCanLearn(tenant, assignment.courseId);
    if (!assignment.published) throw new NotFoundException('Assignment not found');

    const mine = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: tenant.userId } },
    });
    return { ...assignment, mySubmission: mine };
  }

  /**
   * Submit or resubmit. A submission that has already been graded is locked;
   * one that was returned for revision may be edited again.
   */
  async submit(tenant: TenantContext, id: string, dto: SubmitAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id } });
    if (!assignment || !assignment.published) throw new NotFoundException('Assignment not found');
    await this.access.assertCanLearn(tenant, assignment.courseId);

    if (!dto.text?.trim() && !(dto.attachmentUrls?.length)) {
      throw new BadRequestException('Add some text or attach a file before submitting');
    }

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: tenant.userId } },
    });
    if (existing?.status === 'GRADED') {
      throw new ForbiddenException('This assignment has already been graded');
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: tenant.userId } },
      update: {
        text: dto.text ?? null,
        attachmentUrls: dto.attachmentUrls ?? [],
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        assignmentId: id,
        studentId: tenant.userId,
        text: dto.text ?? null,
        attachmentUrls: dto.attachmentUrls ?? [],
        status: 'SUBMITTED',
      },
    });

    // First submission only, so resubmitting cannot farm XP.
    if (!existing) {
      await this.rewards.awardXp(tenant.userId, 'ASSIGNMENT_SUBMITTED', {
        refType: 'assignment', refId: id, description: assignment.title,
      });
    }
    return submission;
  }

  // ----------------------------------------------------------------- guards

  private async assertCanManage(tenant: TenantContext, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { select: { schoolId: true, teacherId: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (tenant.isPlatformAdmin) return assignment;
    if (assignment.teacherId === tenant.userId) return assignment;
    const sameSchool =
      !!assignment.course.schoolId && assignment.course.schoolId === tenant.schoolId;
    if (sameSchool && tenant.isSchoolAdmin) return assignment;
    throw new ForbiddenException('This assignment belongs to another teacher');
  }
}
