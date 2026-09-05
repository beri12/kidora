import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../gamification/rewards.service';
import { TenancyService } from '../common/tenancy.service';
import { ActivityService } from '../common/activity.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { CreateAssignmentDto, GradeSubmissionDto, SubmitAssignmentDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService, private rewards: RewardsService, private tenancy: TenancyService, private activity: ActivityService) {}

  async create(u: AuthUser, dto: CreateAssignmentDto) {
    if (dto.classId) await this.tenancy.assertTeacherOfClass(u, dto.classId);
    if (dto.courseId) await this.tenancy.assertTeacherOfCourse(u, dto.courseId);
    if (!dto.classId && !dto.courseId) throw new BadRequestException('Assign to a class or a course.');
    const a = await this.prisma.assignment.create({ data: { title: dto.title, description: dto.description ?? '', instructions: dto.instructions ?? '', courseId: dto.courseId, lessonId: dto.lessonId, classId: dto.classId, schoolId: u.schoolId, teacherId: u.id, dueAt: dto.dueAt ? new Date(dto.dueAt) : null, maxScore: dto.maxScore ?? 100, attachments: dto.attachments ?? [], status: dto.status ?? 'DRAFT' } });
    if (a.status === 'PUBLISHED') await this.notifyStudents(a.id);
    return a;
  }

  async publish(u: AuthUser, id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id }, select: { teacherId: true, schoolId: true } });
    if (!a) throw new NotFoundException(); if (a.teacherId !== u.id) this.tenancy.assertSameSchool(u, a.schoolId);
    await this.prisma.assignment.update({ where: { id }, data: { status: 'PUBLISHED' } });
    await this.notifyStudents(id);
    return { ok: true };
  }

  async submit(studentId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const a = await this.prisma.assignment.findUnique({ where: { id: assignmentId }, select: { id: true, title: true, status: true, dueAt: true, allowLate: true, classId: true, courseId: true, schoolId: true, xpReward: true, teacherId: true } });
    if (!a || a.status !== 'PUBLISHED') throw new NotFoundException('Assignment not found.');
    const ok = a.classId ? await this.prisma.classEnrollment.count({ where: { studentId, classId: a.classId } }) : await this.prisma.courseEnrollment.count({ where: { studentId, courseId: a.courseId! } });
    if (!ok) throw new ForbiddenException('This assignment is not for you.');
    const isLate = !!a.dueAt && a.dueAt < new Date();
    if (isLate && !a.allowLate) throw new BadRequestException('The due date has passed.');
    const existing = await this.prisma.assignmentSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId } } });
    if (existing?.status === 'GRADED') throw new BadRequestException('This assignment was already graded.');
    const s = await this.prisma.assignmentSubmission.upsert({ where: { assignmentId_studentId: { assignmentId, studentId } }, create: { assignmentId, studentId, content: dto.content, attachments: dto.attachments ?? [], isLate }, update: { content: dto.content, attachments: dto.attachments ?? [], submittedAt: new Date(), isLate, status: 'SUBMITTED' } });
    if (!existing) {
      await this.rewards.onAssignmentSubmitted(studentId, { assignmentId, submissionId: s.id, title: a.title, xpReward: a.xpReward, schoolId: a.schoolId });
      await this.prisma.notification.create({ data: { userId: a.teacherId, type: 'SUBMISSION_RECEIVED', title: 'New submission', body: `${a.title} has a new submission to grade.`, link: `/teacher/assignments/${a.id}` } });
    }
    return s;
  }

  async submissions(u: AuthUser, assignmentId: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id: assignmentId }, select: { teacherId: true, schoolId: true, classId: true } });
    if (!a) throw new NotFoundException(); if (a.teacherId !== u.id) this.tenancy.assertSameSchool(u, a.schoolId);
    return this.prisma.assignmentSubmission.findMany({ where: { assignmentId }, orderBy: { submittedAt: 'desc' }, include: { student: { select: { id: true, name: true, avatarUrl: true } } } });
  }

  async grade(u: AuthUser, submissionId: string, dto: GradeSubmissionDto) {
    const s = await this.prisma.assignmentSubmission.findUnique({ where: { id: submissionId }, include: { assignment: { select: { id: true, title: true, teacherId: true, schoolId: true, maxScore: true } } } });
    if (!s) throw new NotFoundException(); if (s.assignment.teacherId !== u.id) this.tenancy.assertSameSchool(u, s.assignment.schoolId);
    if (dto.score > s.assignment.maxScore) throw new BadRequestException(`Score cannot exceed ${s.assignment.maxScore}.`);
    const before = { score: s.score, feedback: s.feedback };
    const updated = await this.prisma.assignmentSubmission.update({ where: { id: submissionId }, data: { score: dto.score, feedback: dto.feedback, status: 'GRADED', gradedById: u.id, gradedAt: new Date() } });
    await Promise.all([
      this.prisma.notification.create({ data: { userId: s.studentId, type: 'ASSIGNMENT_GRADED', title: `${s.assignment.title} graded`, body: `You scored ${dto.score}/${s.assignment.maxScore}.`, link: '/student/assignments' } }),
      this.activity.log({ userId: u.id, schoolId: s.assignment.schoolId, type: 'ASSIGNMENT_GRADED', title: `Graded ${s.assignment.title}`, entityType: 'submission', entityId: submissionId, meta: { studentId: s.studentId, before, after: { score: dto.score } } }),
      this.prisma.auditLog.create({ data: { actorId: u.id, schoolId: s.assignment.schoolId, action: 'grade.change', entityType: 'AssignmentSubmission', entityId: submissionId, before, after: { score: dto.score, feedback: dto.feedback } } }),
    ]);
    return updated;
  }

  private async notifyStudents(assignmentId: string) {
    const a = await this.prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId }, select: { title: true, dueAt: true, classId: true, courseId: true } });
    const ids = a.classId ? (await this.prisma.classEnrollment.findMany({ where: { classId: a.classId, status: 'ACTIVE' }, select: { studentId: true } })).map((x) => x.studentId) : (await this.prisma.courseEnrollment.findMany({ where: { courseId: a.courseId! }, select: { studentId: true } })).map((x) => x.studentId);
    if (!ids.length) return;
    await this.prisma.notification.createMany({ data: ids.map((userId) => ({ userId, type: 'ASSIGNMENT_DUE' as const, title: 'New assignment', body: a.title + (a.dueAt ? ` · due ${a.dueAt.toDateString()}` : ''), link: '/student/assignments' })) });
    const parents = await this.prisma.parentStudent.findMany({ where: { studentId: { in: ids } }, select: { parentId: true } });
    if (parents.length) await this.prisma.notification.createMany({ data: [...new Set(parents.map((p) => p.parentId))].map((userId) => ({ userId, type: 'ASSIGNMENT_DUE' as const, title: 'New assignment', body: a.title, link: '/parent/assignments' })) });
  }
}
