import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../gamification/rewards.service';
import { TenancyService } from '../common/tenancy.service';
import { CertificatesService } from '../certificates/certificates.service';

import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { CreateQuizDto, SubmitAttemptDto } from './dto';

/**
 * Quiz + exam attempts, auto-grading for objective questions.
 */
/** Fisher-Yates. Used to present a matching question's answers out of order. */
function shuffle<T>(input: T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewards: RewardsService,
    private readonly tenancy: TenancyService,
    private readonly certs: CertificatesService,
  ) {}

  /**
   * Get a quiz for a student.
 *
   * Questions are returned without answers so the student
   * cannot see the correct answer before submitting.
   */
  async getForStudent(studentId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: {
        id: quizId,
      },

      select: {
        id: true,
        title: true,
        description: true,
        timeLimitSec: true,
        maxAttempts: true,
        shuffle: true,
        published: true,
        kind: true,

        questions: {
          orderBy: {
            order: 'asc',
          },

          select: {
            id: true,
            prompt: true,
            type: true,
            options: true,
            points: true,
            imageUrl: true,
            hint: true,
            pairs: true,
          },
        },

        attempts: {
          where: {
            studentId,
          },

          select: {
            id: true,
            status: true,
            attemptNo: true,
            percent: true,
            startedAt: true,
          },
        },
      },
    });

    if (!quiz || !quiz.published) {
      throw new NotFoundException('Quiz not found.');
    }

    await this.assertEnrolled(studentId, quizId);

    /**
     * A MATCHING question is unanswerable without its two columns, but the
     * stored pairs are already matched up. Split them and shuffle the
     * right-hand column so the student gets something to solve rather than
     * the answer key.
     */
    return {
      ...quiz,
      questions: quiz.questions.map((question) => {
        if (question.type !== 'MATCHING') {
          const { pairs: _pairs, ...rest } = question;
          return rest;
        }
        const pairs = Array.isArray(question.pairs)
          ? (question.pairs as { left?: string; right?: string }[])
          : [];
        const { pairs: _pairs, ...rest } = question;
        return {
          ...rest,
          matchLefts: pairs.map((p) => String(p?.left ?? '')),
          matchRights: shuffle(pairs.map((p) => String(p?.right ?? ''))),
        };
      }),
    };
  }

  /**
   * Start a new quiz attempt.
   */
  async startAttempt(
    studentId: string,
    quizId: string,
    examId?: string,
  ) {
    const quiz = await this.getForStudent(studentId, quizId);

    /**
     * If the student already has an open attempt,
     * return it instead of creating another one.
     */
    const openAttempt = quiz.attempts.find(
      (attempt) => attempt.status === 'IN_PROGRESS',
    );

    if (openAttempt) {
      return openAttempt;
    }

    /**
     * Count completed/expired/submitted attempts.
     */
    const usedAttempts = quiz.attempts.filter(
      (attempt) => attempt.status !== 'IN_PROGRESS',
    ).length;

    if (usedAttempts >= quiz.maxAttempts) {
      throw new BadRequestException('No attempts left.');
    }

    /**
     * If this quiz is being taken as an exam,
     * make sure the exam is currently open.
     */
    if (examId) {
      await this.assertExamOpen(examId, studentId);
    }

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        examId,
        attemptNo: usedAttempts + 1,
        maxScore: 0,
      },

      select: {
        id: true,
        status: true,
        attemptNo: true,
        percent: true,
        startedAt: true,
      },
    });
  }

  /**
   * Submit and automatically grade a quiz attempt.
   *
   * Objective questions are automatically graded.
   * Short-answer questions without an expected answer
   * are marked for manual review.
   */
  async submitAttempt(
    studentId: string,
    attemptId: string,
    dto: SubmitAttemptDto,
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: {
        id: attemptId,
      },

      include: {
        quiz: {
          include: {
            questions: true,

            course: {
              select: {
                schoolId: true,
              },
            },

            lesson: {
              select: {
                courseId: true,
                course: {
                  select: {
                    schoolId: true,
                  },
                },
              },
            },
          },
        },

        exam: true,
      },
    });

    if (!attempt || attempt.studentId !== studentId) {
      throw new ForbiddenException();
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'This attempt was already submitted.',
      );
    }

    /**
     * Determine the time limit.
     *
     * Exam duration takes priority over quiz duration.
     */
    const limit = attempt.exam?.durationMin
      ? attempt.exam.durationMin * 60
      : attempt.quiz.timeLimitSec;

    const spent = Math.round(
      (Date.now() - attempt.startedAt.getTime()) / 1000,
    );

    /**
     * Allow 30 seconds of tolerance.
     */
    if (limit && spent > limit + 30) {
      await this.prisma.quizAttempt.update({
        where: {
          id: attemptId,
        },

        data: {
          status: 'EXPIRED',
          timeSpentSec: spent,
        },
      });

      throw new BadRequestException(
        'Time limit exceeded.',
      );
    }

    let score = 0;
    let maxScore = 0;
    let needsManual = false;

    /**
     * Grade every question.
     */
    const answers = attempt.quiz.questions.map((question) => {
      maxScore += question.points;

      const submittedAnswer = dto.answers.find(
        (answer) => answer.questionId === question.id,
      );

      let correct: boolean | null = false;
      let pointsAwarded = 0;

      /**
       * SHORT ANSWER
       */
      if (question.type === 'SHORT_ANSWER') {
        const given = (
          submittedAnswer?.answerText ?? ''
        )
          .trim()
          .toLowerCase();

        const reference = (
          question.answerText ?? ''
        )
          .trim()
          .toLowerCase();

        if (reference) {
          correct = given === reference;
        } else {
          /**
           * No reference answer means manual grading.
           */
          correct = null;
          needsManual = true;
        }
      }

      /**
       * MULTIPLE SELECT
       */
      else if (question.type === 'MULTIPLE_SELECT') {
        const expected = [
          ...question.correctOptions,
        ]
          .sort()
          .join(',');

        const selected = [
          ...(submittedAnswer?.selected ?? []),
        ]
          .sort()
          .join(',');

        correct = expected === selected;
      }

      /**
       * ORDERING
       *
       * `selected` is the option indexes in the order the student put them,
       * so unlike every other type the order itself is the answer and must
       * not be sorted away.
       */
      else if (question.type === 'ORDERING') {
        const given = submittedAnswer?.selected ?? [];
        const expected = question.correctOrder;

        correct =
          expected.length > 0 &&
          given.length === expected.length &&
          given.every((value, i) => value === expected[i]);
      }

      /**
       * MATCHING
       *
       * `selected[i]` is the right-hand item the student paired with the i-th
       * left-hand item. The pairs are stored already matched, so a correct
       * answer is the identity mapping.
       */
      else if (question.type === 'MATCHING') {
        const pairs = Array.isArray(question.pairs)
          ? (question.pairs as { left?: string; right?: string }[])
          : [];

        /**
         * Answered as JSON: the right-hand text the student chose for each
         * left-hand item, in the order the lefts were shown. Text rather than
         * indexes, because indexes into the stored pairs would have to be sent
         * to the browser and would hand over the answer key.
         */
        let chosen: string[] = [];
        try {
          const parsed = JSON.parse(submittedAnswer?.answerText ?? '[]');
          if (Array.isArray(parsed)) chosen = parsed.map((v) => String(v ?? '').trim().toLowerCase());
        } catch {
          chosen = [];
        }

        const expected = pairs.map((p) => String(p?.right ?? '').trim().toLowerCase());

        correct =
          expected.length > 0 &&
          chosen.length === expected.length &&
          chosen.every((value, i) => value === expected[i]);
      }

      /**
       * SINGLE SELECT / TRUE-FALSE / OTHER OBJECTIVE
       */
      else {
        correct =
          (submittedAnswer?.selected ?? [])[0] ===
          question.correct;
      }

      /**
       * Award points for correct answers.
       */
      if (correct === true) {
        pointsAwarded = question.points;
        score += pointsAwarded;
      }

      return {
        attemptId,
        questionId: question.id,
        selected: submittedAnswer?.selected ?? [],
        answerText: submittedAnswer?.answerText,
        correct,
        pointsAwarded,
      };
    });

    /**
     * Calculate percentage.
     */
    const percent = maxScore
      ? Math.round((score / maxScore) * 100)
      : 0;

    /**
     * Exam passing score overrides quiz passing score.
     */
    const passingScore =
      attempt.exam?.passingScore ??
      attempt.quiz.passingScore;

    const passed = percent >= passingScore;

    /**
     * Resolve school ID from either:
     *
     * Quiz -> Course -> School
     *
     * OR
     *
     * Quiz -> Lesson -> Course -> School
     */
    const schoolId =
      attempt.quiz.course?.schoolId ??
      attempt.quiz.lesson?.course.schoolId ??
      null;

    /**
     * Save answers and finalize attempt atomically.
     */
    await this.prisma.$transaction([
      this.prisma.quizAnswer.createMany({
        data: answers,
      }),

      this.prisma.quizAttempt.update({
        where: {
          id: attemptId,
        },

        data: {
          status: needsManual
            ? 'SUBMITTED'
            : 'GRADED',

          submittedAt: new Date(),

          score,

          maxScore,

          percent,

          passed,

          timeSpentSec: spent,
        },
      }),
    ]);

    /**
     * Give rewards / XP.
     */
    const outcome =
      await this.rewards.onQuizSubmitted(
        studentId,
        {
          quizId: attempt.quizId,
          attemptId,
          title: attempt.quiz.title,
          percent,
          xpReward: attempt.quiz.xpReward,
          schoolId,
          isExam: !!attempt.examId,
          courseId: attempt.quiz.courseId ?? attempt.quiz.lesson?.courseId ?? null,
        },
      );

    /**
     * Certificate.
     *
     * Important:
     * The variable must allow both null and the
     * certificate object returned by CertificatesService.
     */
    let certificate: Awaited<
      ReturnType<
        CertificatesService['issueForExam']
      >
    > | null = null;

    if (
      attempt.exam &&
      passed &&
      attempt.exam.issuesCertificate
    ) {
      certificate =
        await this.certs.issueForExam(
          studentId,
          attempt.exam.id,
          percent,
        );
    }

    /**
     * Notify student about the result.
     */
    await this.prisma.notification.create({
      data: {
        userId: studentId,

        type: 'QUIZ_RESULT',

        title: `${attempt.quiz.title}: ${percent}%`,

        body: passed
          ? 'Great work, you passed!'
          : 'Keep practicing and try again.',

        link: attempt.examId
          ? '/student/exams'
          : '/student/quizzes',
      },
    });

    /**
     * Return complete result.
     */
    return {
      attemptId,
      score,
      maxScore,
      percent,
      passed,
      needsManual,
      outcome,
      certificate,

      review: answers.map((answer) => {
        const question =
          attempt.quiz.questions.find(
            (item) =>
              item.id === answer.questionId,
          )!;

        return {
          questionId: question.id,

          correct: answer.correct,

          pointsAwarded:
            answer.pointsAwarded,

          explanation:
            question.explanation,

          correctAnswer:
            question.type ===
            'MULTIPLE_SELECT'
              ? question.correctOptions
              : question.type ===
                  'SHORT_ANSWER'
                ? question.answerText
                : question.correct,
        };
      }),
    };
  }

  /**
   * Teacher creates a quiz.
   *
   * Supports:
   * - Lesson quizzes
   * - Practice quizzes
   * - Exam question banks
   */
  async create(
    user: AuthUser,
    dto: CreateQuizDto,
  ) {
    /**
     * Validate course ownership.
     */
    if (dto.courseId) {
      await this.tenancy.assertTeacherOfCourse(
        user,
        dto.courseId,
      );
    }

    /**
     * Validate lesson ownership.
     */
    if (dto.lessonId) {
      const lesson =
        await this.prisma.lesson.findUnique({
          where: {
            id: dto.lessonId,
          },

          select: {
            courseId: true,
          },
        });

      if (!lesson) {
        throw new NotFoundException(
          'Lesson not found.',
        );
      }

      await this.tenancy.assertTeacherOfCourse(
        user,
        lesson.courseId,
      );
    }

    /**
     * A quiz must contain at least one question.
     */
    if (!dto.questions?.length) {
      throw new BadRequestException(
        'Add at least one question.',
      );
    }

    /**
     * Create quiz + questions.
     */
    return this.prisma.quiz.create({
      data: {
        title: dto.title,

        description:
          dto.description ?? '',

        courseId:
          dto.courseId ?? null,

        lessonId:
          dto.lessonId ?? null,

        kind:
          dto.kind ??
          (dto.lessonId
            ? 'LESSON'
            : 'PRACTICE'),

        timeLimitSec:
          dto.timeLimitSec ?? null,

        maxAttempts:
          dto.maxAttempts ?? 3,

        passingScore:
          dto.passingScore ?? 60,

        questions: {
          create: dto.questions.map(
            (question, index) => ({
              prompt: question.prompt,

              type: question.type,

              /**
               * TRUE/FALSE automatically gets
               * True / False options.
               */
              options:
                question.type ===
                'TRUE_FALSE'
                  ? ['True', 'False']
                  : question.options ?? [],

              correct:
                question.correct ?? 0,

              correctOptions:
                question.correctOptions ??
                [],

              answerText:
                question.answerText,

              points:
                question.points ?? 1,

              explanation:
                question.explanation,

              difficulty:
                question.difficulty ??
                'MEDIUM',

              order: index,
            }),
          ),
        },
      },

      include: {
        questions: true,
      },
    });
  }

  /**
   * Verify that the student is enrolled
   * in the course containing the quiz.
   */
  private async assertEnrolled(
    studentId: string,
    quizId: string,
  ) {
    const quiz =
      await this.prisma.quiz.findUnique({
        where: {
          id: quizId,
        },

        select: {
          courseId: true,

          lesson: {
            select: {
              courseId: true,
            },
          },
        },
      });

    const courseId =
      quiz?.courseId ??
      quiz?.lesson?.courseId;

    /**
     * Quiz does not belong to a course.
     */
    if (!courseId) {
      return;
    }

    const enrollment =
      await this.prisma.courseEnrollment.count({
        where: {
          studentId,
          courseId,
        },
      });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this course.',
      );
    }
  }

  /**
   * Verify that an exam is currently open
   * and that the student is allowed to take it.
   */
  private async assertExamOpen(
    examId: string,
    studentId: string,
  ) {
    const exam =
      await this.prisma.exam.findUnique({
        where: {
          id: examId,
        },

        select: {
          status: true,
          availableFrom: true,
          availableUntil: true,
          classId: true,
          courseId: true,
        },
      });

    if (!exam) {
      throw new NotFoundException(
        'Exam not found.',
      );
    }

    const now = new Date();

    /**
     * Check exam status and availability window.
     */
    if (
      exam.status !== 'OPEN' ||
      (exam.availableFrom &&
        exam.availableFrom > now) ||
      (exam.availableUntil &&
        exam.availableUntil < now)
    ) {
      throw new BadRequestException(
        'This exam is not open.',
      );
    }

    /**
     * If the exam belongs to a class,
     * verify that the student belongs to that class.
     */
    if (exam.classId) {
      const enrollment =
        await this.prisma.classEnrollment.count({
          where: {
            studentId,
            classId: exam.classId,
          },
        });

      if (!enrollment) {
        throw new ForbiddenException(
          'You are not enrolled in this class.',
        );
      }
    }

    /**
     * If the exam has a course but no class,
     * verify course enrollment.
     */
    if (exam.courseId && !exam.classId) {
      const enrollment =
        await this.prisma.courseEnrollment.count({
          where: {
            studentId,
            courseId: exam.courseId,
          },
        });

      if (!enrollment) {
        throw new ForbiddenException(
          'You are not enrolled in this course.',
        );
      }
    }
  }
}