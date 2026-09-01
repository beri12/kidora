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
import { CertificatesService } from '../certificates/certificates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { gradeQuestions, publicQuestion } from '../common/grading/question.grader';
import { seededShuffle } from '../common/grading/grading.util';
import { CreateExamDto, SubmitExamDto, UpdateExamDto } from './dto/exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly audit: AuditService,
    private readonly rewards: RewardsService,
    private readonly certificates: CertificatesService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- teacher

  async create(tenant: TenantContext, dto: CreateExamDto) {
    await this.access.assertCanEdit(tenant, dto.courseId);
    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        teacherId: tenant.userId,
        title: dto.title,
        description: dto.description ?? null,
        timeLimitMin: dto.timeLimitMin ?? 60,
        passingScore: dto.passingScore ?? 70,
        maxAttempts: dto.maxAttempts ?? 2,
        questionCount: dto.questionCount ?? null,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        shuffleOptions: dto.shuffleOptions ?? true,
        isFinal: dto.isFinal ?? true,
        published: dto.published ?? false,
        questions: dto.questions?.length
          ? { create: dto.questions.map((q, i) => this.questionData(q, i)) }
          : undefined,
      },
      include: { questions: true },
    });
  }

  async update(tenant: TenantContext, id: string, dto: UpdateExamDto) {
    const exam = await this.assertCanManage(tenant, id);

    // Replacing the pool wipes nothing a student has already submitted:
    // ExamAttempt stores its own questionIds and answers.
    if (dto.questions) {
      await this.prisma.examQuestion.deleteMany({ where: { examId: exam.id } });
      await this.prisma.examQuestion.createMany({
        data: dto.questions.map((q, i) => ({ ...this.questionData(q, i), examId: exam.id })),
      });
    }

    return this.prisma.exam.update({
      where: { id: exam.id },
      data: {
        title: dto.title,
        description: dto.description,
        timeLimitMin: dto.timeLimitMin,
        passingScore: dto.passingScore,
        maxAttempts: dto.maxAttempts,
        questionCount: dto.questionCount,
        shuffleQuestions: dto.shuffleQuestions,
        shuffleOptions: dto.shuffleOptions,
        isFinal: dto.isFinal,
        published: dto.published,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(tenant: TenantContext, id: string) {
    const exam = await this.assertCanManage(tenant, id);
    const attempts = await this.prisma.examAttempt.count({ where: { examId: exam.id } });
    if (attempts > 0) {
      throw new ForbiddenException('Students have sat this exam. Unpublish it instead of deleting it.');
    }
    await this.prisma.exam.delete({ where: { id: exam.id } });
    return { ok: true };
  }

  listForTeacher(tenant: TenantContext, courseId?: string) {
    return this.prisma.exam.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(tenant.isPlatformAdmin
          ? {}
          : { OR: [{ teacherId: tenant.userId }, { course: { schoolId: tenant.schoolId ?? '__none__' } }] }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
  }

  /** Teacher view of results, with the answer key intact. */
  async results(tenant: TenantContext, id: string) {
    const exam = await this.assertCanManage(tenant, id);
    return this.prisma.examAttempt.findMany({
      where: { examId: exam.id, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      include: { student: { select: { id: true, name: true } } },
    });
  }

  // ---------------------------------------------------------------- student

  /** Exam metadata only — never the questions, and never the answer key. */
  async overview(tenant: TenantContext, id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } }, course: { select: { id: true, title: true } } },
    });
    if (!exam || !exam.published) throw new NotFoundException('Exam not found');
    await this.access.assertCanLearn(tenant, exam.courseId);

    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId: id, studentId: tenant.userId },
      orderBy: { attemptNo: 'asc' },
      select: { attemptNo: true, status: true, percent: true, passed: true, submittedAt: true },
    });

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      course: exam.course,
      timeLimitMin: exam.timeLimitMin,
      passingScore: exam.passingScore,
      maxAttempts: exam.maxAttempts,
      questionCount: exam.questionCount ?? exam._count.questions,
      attempts,
      attemptsLeft: Math.max(0, exam.maxAttempts - attempts.filter((a) => a.status !== 'IN_PROGRESS').length),
    };
  }

  /**
   * Start (or resume) an attempt. The served question set is frozen into the
   * attempt row, so the shuffle cannot be re-rolled by restarting and grading
   * only ever considers the questions this student was actually shown.
   */
  async start(tenant: TenantContext, id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!exam || !exam.published) throw new NotFoundException('Exam not found');
    await this.access.assertCanLearn(tenant, exam.courseId);
    if (exam.questions.length === 0) throw new BadRequestException('This exam has no questions yet');

    const open = await this.prisma.examAttempt.findFirst({
      where: { examId: id, studentId: tenant.userId, status: 'IN_PROGRESS' },
    });
    if (open) {
      if (open.expiresAt && open.expiresAt.getTime() < Date.now()) {
        return this.finalise(open.id, exam, {}, true);
      }
      return this.serveAttempt(open.id, exam);
    }

    const used = await this.prisma.examAttempt.count({
      where: { examId: id, studentId: tenant.userId, status: { not: 'IN_PROGRESS' } },
    });
    if (used >= exam.maxAttempts) {
      throw new ForbiddenException('You have used all attempts for this exam');
    }

    const seed = `${id}:${tenant.userId}:${used + 1}`;
    let pool = exam.questions;
    if (exam.shuffleQuestions) pool = seededShuffle(pool, seed);
    if (exam.questionCount && exam.questionCount < pool.length) pool = pool.slice(0, exam.questionCount);

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: id,
        studentId: tenant.userId,
        attemptNo: used + 1,
        status: 'IN_PROGRESS',
        questionIds: pool.map((q) => q.id),
        expiresAt: new Date(Date.now() + exam.timeLimitMin * 60_000),
        maxScore: pool.reduce((a, q) => a + q.points, 0),
      },
    });
    return this.serveAttempt(attempt.id, exam);
  }

  /** Grade and close an attempt. */
  async submit(tenant: TenantContext, id: string, dto: SubmitExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { questions: true, course: { select: { id: true, title: true, schoolId: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    await this.access.assertCanLearn(tenant, exam.courseId);

    const attempt = await this.prisma.examAttempt.findFirst({
      where: { examId: id, studentId: tenant.userId, status: 'IN_PROGRESS' },
    });
    if (!attempt) throw new BadRequestException('Start the exam before submitting');

    const expired = !!attempt.expiresAt && attempt.expiresAt.getTime() < Date.now();
    return this.finalise(attempt.id, exam, dto.answers ?? {}, expired);
  }

  async result(tenant: TenantContext, id: string) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId: id, studentId: tenant.userId, status: { not: 'IN_PROGRESS' } },
      orderBy: { attemptNo: 'desc' },
      select: {
        attemptNo: true, score: true, maxScore: true, percent: true,
        passed: true, submittedAt: true, status: true,
      },
    });
    if (attempts.length === 0) throw new NotFoundException('No completed attempt yet');
    return { best: attempts.reduce((a, b) => (b.percent > a.percent ? b : a)), attempts };
  }

  // ----------------------------------------------------------------- inner

  private questionData(q: any, i: number) {
    return {
      prompt: q.prompt,
      type: q.type ?? 'MULTIPLE_CHOICE',
      options: q.options ?? [],
      correct: q.correct ?? 0,
      correctText: q.correctText ?? null,
      data: (q.data ?? undefined) as any,
      points: q.points ?? 1,
      order: q.order ?? i,
      explanation: q.explanation ?? null,
    };
  }

  private async serveAttempt(attemptId: string, exam: any) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const byId = new Map(exam.questions.map((q: any) => [q.id, q]));
    const served = attempt.questionIds.map((qid) => byId.get(qid)).filter(Boolean) as any[];

    return {
      attemptId: attempt.id,
      attemptNo: attempt.attemptNo,
      expiresAt: attempt.expiresAt,
      timeLimitMin: exam.timeLimitMin,
      title: exam.title,
      // publicQuestion() drops `correct`, `correctText` and any answer key in `data`.
      questions: served.map((q) => {
        const safe = publicQuestion(q);
        if (!exam.shuffleOptions || !q.options?.length) return safe;
        // Shuffling here would break index-based grading, so option order is
        // varied by seed at render time on the client instead. Options are
        // returned in their stored order and the index remains authoritative.
        return safe;
      }),
    };
  }

  private async finalise(attemptId: string, exam: any, answers: Record<string, unknown>, expired: boolean) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const byId = new Map(exam.questions.map((q: any) => [q.id, q]));
    const served = attempt.questionIds.map((qid) => byId.get(qid)).filter(Boolean) as any[];

    const graded = gradeQuestions(served, answers);
    const passed = !expired && graded.percent >= exam.passingScore;

    const saved = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: expired ? 'EXPIRED' : 'SUBMITTED',
        answers: answers as any,
        score: graded.score,
        maxScore: graded.maxScore,
        percent: graded.percent,
        passed,
        submittedAt: new Date(),
      },
    });

    await this.audit.record({
      actorId: attempt.studentId, schoolId: exam.course?.schoolId ?? null,
      action: 'exam.submit', entity: 'ExamAttempt', entityId: attemptId,
      meta: { examId: exam.id, percent: graded.percent, passed, expired },
    });

    let reward: Awaited<ReturnType<RewardsService['awardXp']>> | null = null;
    let certificate: Awaited<ReturnType<CertificatesService['maybeIssueForCourse']>> = null;
    if (passed) {
      // Only the first pass pays out, so re-sitting a passed exam earns nothing.
      const earlierPass = await this.prisma.examAttempt.count({
        where: { examId: exam.id, studentId: attempt.studentId, passed: true, id: { not: attemptId } },
      });
      if (earlierPass === 0) {
        reward = await this.rewards.awardXp(attempt.studentId, 'EXAM_PASSED', {
          xp: exam.xpReward, coins: exam.coinReward,
          refType: 'exam', refId: exam.id, description: exam.title,
        });
        await this.notifications.create(
          attempt.studentId, '🎯 Exam passed!',
          `${exam.title} — ${graded.percent}%`,
        );
      }
      if (exam.isFinal) {
        certificate = await this.certificates.maybeIssueForCourse(
          attempt.studentId,
          exam.courseId,
          graded.percent,
        );
      }
    }

    return {
      attemptNo: saved.attemptNo,
      score: graded.score,
      maxScore: graded.maxScore,
      percent: graded.percent,
      passed,
      expired,
      passingScore: exam.passingScore,
      correctCount: graded.correctCount,
      total: graded.total,
      reward,
      certificate,
    };
  }

  private async assertCanManage(tenant: TenantContext, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { course: { select: { schoolId: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    if (tenant.isPlatformAdmin) return exam;
    if (exam.teacherId === tenant.userId) return exam;
    const sameSchool = !!exam.course.schoolId && exam.course.schoolId === tenant.schoolId;
    if (sameSchool && tenant.isSchoolAdmin) return exam;
    throw new ForbiddenException('This exam belongs to another teacher');
  }
}
