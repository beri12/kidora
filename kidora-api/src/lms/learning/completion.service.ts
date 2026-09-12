import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

export interface CompletionState {
  /** Lesson progress, which is what the progress bar shows. */
  percent: number;
  lessonsCompleted: number;
  totalLessons: number;
  /** Every completion rule is satisfied. */
  complete: boolean;
  /** Average of the student's best score on each required assessment, or null. */
  score: number | null;
  /** Human-readable list of what is still outstanding. */
  unmet: string[];
  requirements: {
    lessons: { required: boolean; done: number; total: number; ok: boolean };
    quizzes: { required: boolean; done: number; total: number; ok: boolean };
    assignments: { required: boolean; done: number; total: number; ok: boolean };
    exam: { required: boolean; passed: boolean; ok: boolean };
  };
}

/**
 * Evaluates a course's completion rules (spec §10, §19) against one student.
 *
 * Lesson progress alone used to decide completion, so a course that required
 * a final exam would mark itself complete the moment the last lesson was
 * ticked. Every rule configured on the course is checked here, and this is the
 * single place that decides — the reward rollup and the student API both
 * call it rather than each having their own idea of "done".
 */
@Injectable()
export class CompletionService {
  constructor(private prisma: PrismaService) {}

  async evaluate(studentId: string, courseId: string, client?: Tx): Promise<CompletionState> {
    const db = client ?? this.prisma;
    const course = await db.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        requireAllLessons: true, requireAllQuizzes: true, requireAllAssignments: true,
        requireFinalExam: true, passingScore: true,
      },
    });

    const [totalLessons, lessonsDone, requiredQuizzes, requiredAssignments, exam] = await Promise.all([
      db.lesson.count({ where: { courseId, status: 'PUBLISHED' } }),
      db.progress.count({ where: { userId: studentId, completed: true, lesson: { courseId, status: 'PUBLISHED' } } }),
      db.quiz.findMany({
        where: { courseId, kind: { not: 'FINAL_EXAM' }, published: true, ...(course.requireAllQuizzes ? { isRequired: true } : {}) },
        select: { id: true, passingScore: true, attempts: { where: { studentId, status: { in: ['SUBMITTED', 'GRADED'] } }, select: { percent: true, passed: true } } },
      }),
      db.assignment.findMany({
        where: { courseId, status: { not: 'DRAFT' }, ...(course.requireAllAssignments ? { isRequired: true } : {}) },
        select: { id: true, submissions: { where: { studentId }, select: { status: true, score: true, } }, maxScore: true },
      }),
      db.exam.findFirst({
        where: { courseId },
        select: { id: true, passingScore: true, quiz: { select: { attempts: { where: { studentId, status: { in: ['SUBMITTED', 'GRADED'] } }, select: { percent: true, passed: true } } } } },
      }),
    ]);

    const quizzesPassed = requiredQuizzes.filter((q) => q.attempts.some((a) => a.passed || a.percent >= q.passingScore));
    const assignmentsDone = requiredAssignments.filter((a) => a.submissions.length > 0);
    const examAttempts = exam?.quiz.attempts ?? [];
    const examPassed = examAttempts.some((a) => a.passed || a.percent >= (exam?.passingScore ?? 60));

    const requirements = {
      lessons: {
        required: course.requireAllLessons,
        done: lessonsDone, total: totalLessons,
        ok: !course.requireAllLessons || (totalLessons > 0 && lessonsDone >= totalLessons),
      },
      quizzes: {
        required: course.requireAllQuizzes,
        done: quizzesPassed.length, total: requiredQuizzes.length,
        ok: !course.requireAllQuizzes || quizzesPassed.length >= requiredQuizzes.length,
      },
      assignments: {
        required: course.requireAllAssignments,
        done: assignmentsDone.length, total: requiredAssignments.length,
        ok: !course.requireAllAssignments || assignmentsDone.length >= requiredAssignments.length,
      },
      exam: {
        required: course.requireFinalExam,
        passed: examPassed,
        ok: !course.requireFinalExam || examPassed,
      },
    };

    const unmet: string[] = [];
    if (!requirements.lessons.ok) unmet.push(`Finish every lesson (${lessonsDone}/${totalLessons}).`);
    if (!requirements.quizzes.ok) unmet.push(`Pass every required quiz (${quizzesPassed.length}/${requiredQuizzes.length}).`);
    if (!requirements.assignments.ok) unmet.push(`Hand in every required assignment (${assignmentsDone.length}/${requiredAssignments.length}).`);
    if (!requirements.exam.ok) unmet.push('Pass the final exam.');

    // A course with no published lessons is not something a student can
    // complete, whatever the other rules say.
    const complete = totalLessons > 0 && unmet.length === 0;

    const scores: number[] = [
      ...requiredQuizzes.flatMap((q) => (q.attempts.length ? [Math.max(...q.attempts.map((a) => a.percent))] : [])),
      ...(examAttempts.length ? [Math.max(...examAttempts.map((a) => a.percent))] : []),
      ...requiredAssignments.flatMap((a) => {
        const graded = a.submissions.filter((sub) => sub.score !== null);
        return graded.length && a.maxScore > 0 ? [Math.round((Math.max(...graded.map((g) => g.score!)) / a.maxScore) * 100)] : [];
      }),
    ];

    return {
      percent: totalLessons ? Math.round((lessonsDone / totalLessons) * 100) : 0,
      lessonsCompleted: lessonsDone,
      totalLessons,
      complete,
      score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      unmet,
      requirements,
    };
  }

  /**
   * Writes the enrollment row to match the evaluated state, and issues a
   * certificate the first time the course is completed. Idempotent: calling it
   * again on an already-complete course changes nothing and re-uses the
   * existing certificate.
   */
  async sync(tx: Tx, studentId: string, courseId: string, lastLessonId?: string | null) {
    const state = await this.evaluate(studentId, courseId, tx);
    const enrollment = await tx.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { id: true, status: true },
    });
    const nowComplete = state.complete;
    const wasComplete = enrollment?.status === 'COMPLETED';

    await tx.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      create: {
        courseId, studentId, progressPercent: state.percent, lessonsCompleted: state.lessonsCompleted,
        lastLessonId: lastLessonId ?? null, lastActivityAt: new Date(),
        status: nowComplete ? 'COMPLETED' : 'ACTIVE', completedAt: nowComplete ? new Date() : null,
      },
      update: {
        progressPercent: state.percent, lessonsCompleted: state.lessonsCompleted,
        ...(lastLessonId ? { lastLessonId } : {}), lastActivityAt: new Date(),
        ...(nowComplete
          ? { status: 'COMPLETED' as const, ...(wasComplete ? {} : { completedAt: new Date() }) }
          : { status: 'ACTIVE' as const, completedAt: null }),
      },
    });

    let certificate: { id: string; code: string | null } | null = null;
    if (nowComplete && !wasComplete) {
      certificate = await this.issueCertificate(tx, studentId, courseId, state.score);
    }
    return { state, justCompleted: nowComplete && !wasComplete, certificate };
  }

  /** Certificate issue inside the caller's transaction, so completion and the certificate commit together. */
  private async issueCertificate(tx: Tx, studentId: string, courseId: string, score: number | null) {
    const course = await tx.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { title: true, schoolId: true, issuesCertificate: true, grade: { select: { name: true } }, school: { select: { name: true } } },
    });
    if (!course.issuesCertificate) return null;
    const existing = await tx.certificate.findFirst({ where: { userId: studentId, courseId, revoked: false }, select: { id: true, code: true } });
    if (existing) return existing;
    const student = await tx.user.findUniqueOrThrow({ where: { id: studentId }, select: { name: true, grade: { select: { name: true } } } });
    const cert = await tx.certificate.create({
      data: {
        userId: studentId, courseId, schoolId: course.schoolId, courseName: course.title,
        studentName: student.name, schoolName: course.school?.name ?? '',
        gradeName: student.grade?.name ?? course.grade?.name, score,
        code: `KID-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      },
      select: { id: true, code: true },
    });
    await tx.notification.create({
      data: { userId: studentId, type: 'CERTIFICATE', title: 'Certificate earned!', body: course.title, link: '/student/certificates' },
    });
    const parents = await tx.parentStudent.findMany({ where: { studentId }, select: { parentId: true } });
    if (parents.length) {
      await tx.notification.createMany({
        data: parents.map((p) => ({
          userId: p.parentId, type: 'CERTIFICATE' as const,
          title: `${student.name} earned a certificate`, body: course.title, link: '/parent/achievements',
        })),
      });
    }
    return cert;
  }
}
