import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AuthoringService } from './authoring.service';
import {
  AssignmentDto, ExamDto, QuestionDto, QuizDto, UpdateAssignmentDto, UpdateExamDto, UpdateQuizDto,
} from './dto';

/**
 * Quiz, assignment and exam authoring for a course the teacher owns.
 *
 * A question is only well-formed for some question types — a MULTIPLE_CHOICE
 * needs options and a correct index, an ORDERING needs a full permutation.
 * `normaliseQuestion` rejects the rest rather than storing a question no
 * student could ever answer correctly.
 */
@Injectable()
export class AssessmentAuthoringService {
  constructor(private prisma: PrismaService, private authoring: AuthoringService) {}

  /* ------------------------------------------------------------------ quiz */

  async createQuiz(u: AuthUser, courseId: string, dto: QuizDto) {
    await this.authoring.assertAuthor(u, courseId);
    await this.assertLessonInCourse(dto.lessonId, courseId);
    if (dto.lessonId) {
      const taken = await this.prisma.quiz.findUnique({ where: { lessonId: dto.lessonId }, select: { id: true } });
      if (taken) throw new BadRequestException('That lesson already has a quiz.');
    }
    const questions = (dto.questions ?? []).map((q, i) => this.normaliseQuestion(q, i));
    return this.prisma.quiz.create({
      data: {
        ...this.quizData(dto),
        title: dto.title,
        courseId,
        lessonId: dto.lessonId,
        kind: 'LESSON',
        questions: { create: questions },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async getQuiz(u: AuthUser, quizId: string) {
    const quiz = await this.quizOr404(quizId);
    await this.authoring.assertAuthor(u, quiz.courseId!);
    return this.prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        lesson: { select: { id: true, title: true } },
        _count: { select: { attempts: true } },
      },
    });
  }

  /** Updates settings, and replaces the questions wholesale when they are sent. */
  async updateQuiz(u: AuthUser, quizId: string, dto: UpdateQuizDto) {
    const quiz = await this.quizOr404(quizId);
    await this.authoring.assertAuthor(u, quiz.courseId!);
    const questions = dto.questions?.map((q, i) => this.normaliseQuestion(q, i));
    return this.prisma.$transaction(async (tx) => {
      if (questions) {
        // Answers reference questions, so old attempts would break if we
        // deleted questions that have been answered. Keep them: only replace
        // the question set on a quiz nobody has attempted yet.
        const attempted = await tx.quizAttempt.count({ where: { quizId } });
        if (attempted > 0) {
          throw new BadRequestException(
            'Students have already attempted this quiz, so its questions can no longer be replaced. Duplicate it to make a new version.',
          );
        }
        await tx.quizQuestion.deleteMany({ where: { quizId } });
        await tx.quizQuestion.createMany({ data: questions.map((q) => ({ ...q, quizId })) });
      }
      await tx.quiz.update({ where: { id: quizId }, data: { ...this.quizData(dto), title: dto.title } });
      return tx.quiz.findUniqueOrThrow({
        where: { id: quizId },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    }, { timeout: 20000 });
  }

  async deleteQuiz(u: AuthUser, quizId: string) {
    const quiz = await this.quizOr404(quizId);
    await this.authoring.assertAuthor(u, quiz.courseId!);
    if (quiz.examId) throw new BadRequestException('Delete the final exam instead — this quiz is its question set.');
    await this.prisma.quiz.delete({ where: { id: quizId } });
    return { ok: true };
  }

  async listQuizzes(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.quiz.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      include: {
        lesson: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
  }

  /* ------------------------------------------------------------ assignment */

  async createAssignment(u: AuthUser, courseId: string, dto: AssignmentDto) {
    const course = await this.authoring.assertAuthor(u, courseId);
    await this.assertLessonInCourse(dto.lessonId, courseId);
    return this.prisma.assignment.create({
      data: {
        ...this.assignmentData(dto),
        title: dto.title,
        courseId,
        lessonId: dto.lessonId,
        classId: dto.classId,
        schoolId: course.schoolId,
        teacherId: u.id,
        status: 'DRAFT',
      },
    });
  }

  async getAssignment(u: AuthUser, assignmentId: string) {
    const a = await this.assignmentOr404(assignmentId);
    await this.authoring.assertAuthor(u, a.courseId!);
    return this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        lesson: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  async updateAssignment(u: AuthUser, assignmentId: string, dto: UpdateAssignmentDto) {
    const a = await this.assignmentOr404(assignmentId);
    await this.authoring.assertAuthor(u, a.courseId!);
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { ...this.assignmentData(dto), title: dto.title },
    });
  }

  async deleteAssignment(u: AuthUser, assignmentId: string) {
    const a = await this.assignmentOr404(assignmentId);
    await this.authoring.assertAuthor(u, a.courseId!);
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    return { ok: true };
  }

  async setAssignmentStatus(u: AuthUser, assignmentId: string, status: 'DRAFT' | 'PUBLISHED' | 'CLOSED') {
    const a = await this.assignmentOr404(assignmentId);
    await this.authoring.assertAuthor(u, a.courseId!);
    if (status === 'PUBLISHED') {
      const full = await this.prisma.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
        select: { instructions: true, description: true, maxScore: true },
      });
      if (!full.instructions.trim() && !full.description.trim()) {
        throw new BadRequestException('Add instructions before publishing this assignment.');
      }
      if (full.maxScore < 1) throw new BadRequestException('Set a maximum score above zero.');
    }
    return this.prisma.assignment.update({ where: { id: assignmentId }, data: { status } });
  }

  async listAssignments(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      include: { lesson: { select: { id: true, title: true } }, _count: { select: { submissions: true } } },
    });
  }

  /* ------------------------------------------------------------------ exam */

  /**
   * A course has at most one final exam. The exam's questions live on a Quiz
   * row of kind FINAL_EXAM, which is how the existing attempt/grading pipeline
   * already reads them — so the exam reuses all of it rather than duplicating.
   */
  async upsertExam(u: AuthUser, courseId: string, dto: ExamDto) {
    const course = await this.authoring.assertAuthor(u, courseId);
    const questions = (dto.questions ?? []).map((q, i) => this.normaliseQuestion(q, i));
    const existing = await this.prisma.exam.findFirst({ where: { courseId }, select: { id: true, quizId: true } });

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (dto.questions) {
          const attempted = await tx.quizAttempt.count({ where: { quizId: existing.quizId } });
          if (attempted > 0) {
            throw new BadRequestException(
              'Students have already sat this exam, so its questions can no longer be replaced.',
            );
          }
          await tx.quizQuestion.deleteMany({ where: { quizId: existing.quizId } });
          await tx.quizQuestion.createMany({ data: questions.map((q) => ({ ...q, quizId: existing.quizId })) });
        }
        await tx.quiz.update({
          where: { id: existing.quizId },
          data: {
            title: dto.title,
            description: dto.description,
            passingScore: dto.passingScore,
            timeLimitSec: dto.durationMin ? dto.durationMin * 60 : undefined,
            shuffle: dto.shuffle,
          },
        });
        await tx.exam.update({
          where: { id: existing.id },
          data: this.examData(dto),
        });
      } else {
        const quiz = await tx.quiz.create({
          data: {
            title: dto.title,
            description: dto.description ?? '',
            kind: 'FINAL_EXAM',
            courseId,
            passingScore: dto.passingScore ?? 60,
            timeLimitSec: dto.durationMin ? dto.durationMin * 60 : null,
            shuffle: dto.shuffle ?? false,
            maxAttempts: 1,
            published: false,
            questions: { create: questions },
          },
        });
        await tx.exam.create({
          data: {
            ...this.examData(dto),
            title: dto.title,
            courseId,
            quizId: quiz.id,
            schoolId: course.schoolId,
            teacherId: u.id,
            status: 'DRAFT',
          },
        });
      }
      return tx.exam.findFirstOrThrow({
        where: { courseId },
        include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
      });
    }, { timeout: 20000 });
  }

  async getExam(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.exam.findFirst({
      where: { courseId },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { attempts: true } } } },
      },
    });
  }

  async deleteExam(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    const exam = await this.prisma.exam.findFirst({ where: { courseId }, select: { id: true, quizId: true } });
    if (!exam) throw new NotFoundException('This course has no final exam.');
    await this.prisma.$transaction([
      this.prisma.exam.delete({ where: { id: exam.id } }),
      this.prisma.quiz.delete({ where: { id: exam.quizId } }),
    ]);
    return { ok: true };
  }

  async setExamStatus(u: AuthUser, courseId: string, status: 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED') {
    await this.authoring.assertAuthor(u, courseId);
    const exam = await this.prisma.exam.findFirst({ where: { courseId }, select: { id: true, quizId: true } });
    if (!exam) throw new NotFoundException('This course has no final exam.');
    if (status !== 'DRAFT') {
      const count = await this.prisma.quizQuestion.count({ where: { quizId: exam.quizId } });
      if (count === 0) throw new BadRequestException('Add at least one question before opening the exam.');
    }
    await this.prisma.quiz.update({
      where: { id: exam.quizId },
      data: { published: status === 'OPEN' || status === 'SCHEDULED' },
    });
    return this.prisma.exam.update({ where: { id: exam.id }, data: { status } });
  }

  /* --------------------------------------------------------------- helpers */

  private quizData(dto: UpdateQuizDto) {
    return {
      description: dto.description,
      sectionId: dto.sectionId,
      timeLimitSec: dto.timeLimitSec,
      maxAttempts: dto.maxAttempts,
      passingScore: dto.passingScore,
      shuffle: dto.shuffle,
      shuffleAnswers: dto.shuffleAnswers,
      showExplanations: dto.showExplanations,
      showScore: dto.showScore,
      allowRetry: dto.allowRetry,
      isRequired: dto.isRequired,
      published: dto.published,
      grading: dto.grading,
    };
  }

  private assignmentData(dto: UpdateAssignmentDto) {
    return {
      description: dto.description,
      instructions: dto.instructions,
      dueAt: dto.dueAt ? this.date(dto.dueAt, 'dueAt') : undefined,
      maxScore: dto.maxScore,
      allowLate: dto.allowLate,
      allowResubmit: dto.allowResubmit,
      isRequired: dto.isRequired,
      submissionType: dto.submissionType,
      allowedFileTypes: dto.allowedFileTypes,
      peerReviewCount: dto.peerReviewCount,
      peerReviewsDue: dto.peerReviewsDue,
      ...(dto.rubric ? { rubric: dto.rubric as unknown as Prisma.InputJsonValue } : {}),
      ...(dto.attachments ? { attachments: dto.attachments as unknown as Prisma.InputJsonValue } : {}),
    };
  }

  private examData(dto: UpdateExamDto) {
    return {
      description: dto.description,
      classId: dto.classId,
      scheduledAt: dto.scheduledAt ? this.date(dto.scheduledAt, 'scheduledAt') : undefined,
      availableFrom: dto.availableFrom ? this.date(dto.availableFrom, 'availableFrom') : undefined,
      availableUntil: dto.availableUntil ? this.date(dto.availableUntil, 'availableUntil') : undefined,
      durationMin: dto.durationMin,
      passingScore: dto.passingScore,
      issuesCertificate: dto.issuesCertificate,
    };
  }

  private date(value: string, field: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`${field} is not a valid date.`);
    return d;
  }

  /**
   * Turn one authored question into a storable row, rejecting anything a
   * student could not be graded against.
   */
  private normaliseQuestion(q: QuestionDto, order: number) {
    const type = q.type ?? QuestionType.MULTIPLE_CHOICE;
    const options = q.options ?? [];
    const base = {
      prompt: q.prompt,
      type,
      options,
      explanation: q.explanation,
      hint: q.hint,
      imageUrl: q.imageUrl,
      points: q.points ?? 1,
      difficulty: q.difficulty ?? 'MEDIUM',
      order,
      correct: 0,
      correctOptions: [] as number[],
      correctOrder: [] as number[],
      answerText: null as string | null,
      pairs: [] as unknown as Prisma.InputJsonValue,
    };
    const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < options.length;
    const where = `Question ${order + 1} ("${q.prompt.slice(0, 40)}")`;

    switch (type) {
      case QuestionType.MULTIPLE_CHOICE: {
        if (options.length < 2) throw new BadRequestException(`${where} needs at least two options.`);
        if (!inRange(q.correct ?? -1)) throw new BadRequestException(`${where} needs a correct option.`);
        return { ...base, correct: q.correct! };
      }
      case QuestionType.TRUE_FALSE: {
        const opts = options.length === 2 ? options : ['True', 'False'];
        if (!Number.isInteger(q.correct) || q.correct! < 0 || q.correct! > 1) {
          throw new BadRequestException(`${where} needs the correct answer marked true or false.`);
        }
        return { ...base, options: opts, correct: q.correct! };
      }
      case QuestionType.MULTIPLE_SELECT: {
        if (options.length < 2) throw new BadRequestException(`${where} needs at least two options.`);
        const picked = q.correctOptions ?? [];
        if (!picked.length) throw new BadRequestException(`${where} needs at least one correct option.`);
        if (picked.some((i) => !inRange(i))) throw new BadRequestException(`${where} marks an option that does not exist.`);
        return { ...base, correctOptions: [...new Set(picked)].sort((a, b) => a - b), correct: picked[0] };
      }
      case QuestionType.SHORT_ANSWER: {
        if (!q.answerText?.trim()) throw new BadRequestException(`${where} needs a reference answer.`);
        return { ...base, options: [], answerText: q.answerText.trim() };
      }
      case QuestionType.ORDERING: {
        if (options.length < 2) throw new BadRequestException(`${where} needs at least two items to order.`);
        const seq = q.correctOrder ?? [];
        const complete = seq.length === options.length && new Set(seq).size === options.length && seq.every(inRange);
        if (!complete) throw new BadRequestException(`${where} needs every item placed exactly once in the correct order.`);
        return { ...base, correctOrder: seq };
      }
      case QuestionType.MATCHING: {
        const pairs = q.pairs ?? [];
        if (pairs.length < 2) throw new BadRequestException(`${where} needs at least two pairs.`);
        if (pairs.some((p) => !p?.left?.trim() || !p?.right?.trim())) {
          throw new BadRequestException(`${where} has a pair with an empty side.`);
        }
        return { ...base, options: [], pairs: pairs as unknown as Prisma.InputJsonValue };
      }
      default:
        throw new BadRequestException(`${where} uses an unsupported question type.`);
    }
  }

  private async assertLessonInCourse(lessonId: string | undefined, courseId: string) {
    if (!lessonId) return;
    const l = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!l) throw new NotFoundException('Lesson not found.');
    if (l.courseId !== courseId) throw new BadRequestException('That lesson belongs to another course.');
  }

  private async quizOr404(id: string) {
    const q = await this.prisma.quiz.findUnique({
      where: { id },
      select: { id: true, courseId: true, exam: { select: { id: true } } },
    });
    if (!q) throw new NotFoundException('Quiz not found.');
    if (!q.courseId) throw new NotFoundException('Quiz not found.');
    return { ...q, examId: q.exam?.id ?? null };
  }

  private async assignmentOr404(id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id }, select: { id: true, courseId: true } });
    if (!a) throw new NotFoundException('Assignment not found.');
    if (!a.courseId) throw new NotFoundException('Assignment not found.');
    return a;
  }
}
