import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantService } from '../common/tenancy/tenant.service';
import { CourseAccessService } from '../courses/course-access.service';
import { gradeQuestions, publicQuestion } from '../common/grading/question.grader';
import { seededShuffle } from '../common/grading/grading.util';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { TenantContext } from '../common/tenancy/tenant.types';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private rewards: RewardsService,
    private notifications: NotificationsService,
    private tenants?: TenantService,
    private access?: CourseAccessService,
  ) {}

  /**
   * Serve a quiz WITHOUT the correct answers.
   * publicQuestion() removes `correct`, `correctText` and any answer key nested
   * in `data`, so no student-facing response can ever contain the key.
   */
  async get(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    const questions = quiz.shuffleQuestions
      ? seededShuffle(quiz.questions, quiz.id)
      : quiz.questions;
    return { ...quiz, questions: questions.map(publicQuestion) };
  }

  /**
   * Grade server-side and pay the reward.
   *
   * The response shape is a superset of the original
   * `{ score, total, pointsEarned, perfect }`, so existing clients keep working.
   *
   * `answers` accepts either the original positional `number[]` or a map keyed
   * by question id (needed by the richer question types). A client never sends
   * a score — only responses.
   */
  async submit(quizId: string, userId: string, answers: number[] | Record<string, unknown>) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.assertCanTake(userId, quiz);

    const previous = await this.prisma.quizAttempt.count({
      where: { quizId, studentId: userId, status: 'SUBMITTED' },
    });
    if (quiz.maxAttempts > 0 && previous >= quiz.maxAttempts) {
      throw new ForbiddenException('You have used all attempts for this quiz');
    }

    const graded = gradeQuestions(quiz.questions as any, answers as any);
    const passed = graded.percent >= quiz.passingScore;
    const perfect = graded.total > 0 && graded.correctCount === graded.total;

    await this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: userId,
        attemptNo: previous + 1,
        status: 'SUBMITTED',
        score: graded.score,
        maxScore: graded.maxScore,
        percent: graded.percent,
        passed,
        answers: (Array.isArray(answers) ? { positional: answers } : answers) as any,
        submittedAt: new Date(),
      },
    });

    // Original reward rule preserved: 10 points per correct answer.
    const points = graded.correctCount * 10;
    const reward = await this.rewards.awardXp(
      userId,
      perfect ? 'QUIZ_PERFECT' : 'QUIZ_COMPLETED',
      {
        xp: points || quiz.xpReward,
        coins: quiz.coinReward,
        refType: 'quiz',
        refId: quizId,
        description: quiz.title,
      },
    );

    if (perfect) {
      await this.rewards.award(userId, 'quiz-champ');
      await this.notifications.create(userId, '⭐ Perfect score!', 'You aced the quiz and earned a badge.');
    }

    return {
      // --- original contract ---
      score: graded.correctCount,
      total: graded.total,
      pointsEarned: points,
      perfect,
      // --- added ---
      percent: graded.percent,
      passed,
      passingScore: quiz.passingScore,
      attemptNo: previous + 1,
      attemptsLeft: quiz.maxAttempts > 0 ? Math.max(0, quiz.maxAttempts - previous - 1) : null,
      pointsScore: graded.score,
      maxScore: graded.maxScore,
      perQuestion: graded.perQuestion,
      reward,
    };
  }

  /** Attempt history for the signed-in learner. */
  attempts(quizId: string, userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, studentId: userId, status: 'SUBMITTED' },
      orderBy: { attemptNo: 'desc' },
      select: { attemptNo: true, percent: true, passed: true, score: true, maxScore: true, submittedAt: true },
    });
  }

  // ---------------------------------------------------------------- teacher

  async create(tenant: TenantContext, dto: CreateQuizDto) {
    if (dto.courseId) await this.access!.assertCanEdit(tenant, dto.courseId);
    else if (dto.lessonId) await this.access!.assertCanEditLesson(tenant, dto.lessonId);
    else throw new BadRequestException('A quiz needs a courseId or a lessonId');

    const courseId =
      dto.courseId ??
      (await this.prisma.lesson.findUnique({ where: { id: dto.lessonId! }, select: { courseId: true } }))
        ?.courseId ??
      null;

    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        courseId,
        sectionId: dto.sectionId ?? null,
        lessonId: dto.lessonId ?? null,
        passingScore: dto.passingScore ?? 60,
        timeLimitSec: dto.timeLimitSec ?? null,
        maxAttempts: dto.maxAttempts ?? 0,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, i) => ({
                prompt: q.prompt,
                type: q.type ?? 'MULTIPLE_CHOICE',
                options: q.options ?? [],
                correct: q.correct ?? 0,
                data: (q.data ?? undefined) as any,
                points: q.points ?? 1,
                order: q.order ?? i,
                explanation: q.explanation ?? null,
              })),
            }
          : undefined,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async update(tenant: TenantContext, id: string, dto: UpdateQuizDto) {
    const quiz = await this.assertCanManage(tenant, id);

    if (dto.questions) {
      await this.prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await this.prisma.quizQuestion.createMany({
        data: dto.questions.map((q, i) => ({
          quizId: quiz.id,
          prompt: q.prompt,
          type: q.type ?? 'MULTIPLE_CHOICE',
          options: q.options ?? [],
          correct: q.correct ?? 0,
          data: (q.data ?? undefined) as any,
          points: q.points ?? 1,
          order: q.order ?? i,
          explanation: q.explanation ?? null,
        })),
      });
    }

    return this.prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        title: dto.title,
        description: dto.description,
        passingScore: dto.passingScore,
        timeLimitSec: dto.timeLimitSec,
        maxAttempts: dto.maxAttempts,
        shuffleQuestions: dto.shuffleQuestions,
        shuffleOptions: dto.shuffleOptions,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(tenant: TenantContext, id: string) {
    const quiz = await this.assertCanManage(tenant, id);
    await this.prisma.quiz.delete({ where: { id: quiz.id } });
    return { ok: true };
  }

  // ----------------------------------------------------------------- inner

  /** A learner may only take a quiz attached to a course they can open. */
  private async assertCanTake(userId: string, quiz: { courseId: string | null; lessonId: string | null }) {
    if (!this.tenants || !this.access) return; // standalone/unit-test usage
    const courseId =
      quiz.courseId ??
      (quiz.lessonId
        ? (await this.prisma.lesson.findUnique({ where: { id: quiz.lessonId }, select: { courseId: true } }))
            ?.courseId ?? null
        : null);
    if (!courseId) return; // free-standing quiz, not attached to a course
    const tenant = await this.tenants.resolve(userId);
    await this.access.assertCanLearn(tenant, courseId);
  }

  private async assertCanManage(tenant: TenantContext, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    const courseId =
      quiz.courseId ??
      (quiz.lessonId
        ? (await this.prisma.lesson.findUnique({ where: { id: quiz.lessonId }, select: { courseId: true } }))
            ?.courseId ?? null
        : null);
    if (!courseId) {
      if (!tenant.isPlatformAdmin) throw new ForbiddenException('Cannot modify this quiz');
      return quiz;
    }
    await this.access!.assertCanEdit(tenant, courseId);
    return quiz;
  }
}
