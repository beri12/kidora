import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Issue once per course per user. (Original signature, still used by
  // ProgressService — kept so existing callers keep working.)
  async issue(userId: string, courseName: string) {
    const existing = await this.prisma.certificate.findFirst({ where: { userId, courseName } });
    if (existing) return existing;
    const cert = await this.prisma.certificate.create({
      data: { userId, courseName, serial: newSerial() },
    });
    await this.notifications.create(userId, '🎓 Certificate earned!', 'You completed "' + courseName + '". Download your certificate.');
    return cert;
  }

  /**
   * The eligibility gate. A certificate is issued only when the learner has
   * actually finished the course:
   *
   *   every required lesson complete
   *   AND every published quiz in the course passed
   *   AND (if the course has a final exam) that exam passed
   *
   * Called from the server after an exam or a lesson completion — never from a
   * client route, so a student cannot issue their own certificate.
   */
  async maybeIssueForCourse(userId: string, courseId: string, examPercent?: number) {
    const eligibility = await this.checkEligibility(userId, courseId);
    if (!eligibility.eligible) return null;

    const existing = await this.prisma.certificate.findFirst({ where: { userId, courseId } });
    if (existing) return existing;

    const [student, course] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, schoolId: true, grade: { select: { name: true } }, school: { select: { name: true } } },
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, schoolId: true },
      }),
    ]);
    if (!course) throw new NotFoundException('Course not found');

    const cert = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        courseName: course.title,
        schoolId: course.schoolId ?? student?.schoolId ?? null,
        schoolName: student?.school?.name ?? null,
        gradeName: student?.grade?.name ?? null,
        studentName: student?.name ?? null,
        score: examPercent ?? eligibility.averageScore,
        serial: newSerial(),
      },
    });

    await this.notifications.create(
      userId,
      '🎓 Certificate earned!',
      `You completed "${course.title}". Your certificate is ready.`,
    );
    return cert;
  }

  /** Everything the UI needs to explain *why* a certificate is or isn't ready. */
  async checkEligibility(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        lessons: { select: { id: true, isRequired: true } },
        quizzes: { select: { id: true, passingScore: true } },
        exams: { where: { published: true, isFinal: true }, select: { id: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const requiredLessons = course.lessons.filter((l) => l.isRequired).map((l) => l.id);
    const doneLessons = requiredLessons.length
      ? await this.prisma.progress.count({
          where: { userId, completed: true, lessonId: { in: requiredLessons } },
        })
      : 0;
    const lessonsComplete = requiredLessons.length === 0 || doneLessons >= requiredLessons.length;

    const quizIds = course.quizzes.map((q) => q.id);
    const quizAttempts = quizIds.length
      ? await this.prisma.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, studentId: userId, passed: true },
          select: { quizId: true, percent: true },
        })
      : [];
    const passedQuizIds = new Set(quizAttempts.map((a) => a.quizId));
    const quizzesPassed = quizIds.every((id) => passedQuizIds.has(id));

    const examIds = course.exams.map((e) => e.id);
    const examAttempts = examIds.length
      ? await this.prisma.examAttempt.findMany({
          where: { examId: { in: examIds }, studentId: userId, passed: true },
          select: { examId: true, percent: true },
        })
      : [];
    const examPassed = examIds.length === 0 || examIds.every((id) => examAttempts.some((a) => a.examId === id));

    const scores = [...quizAttempts.map((a) => a.percent), ...examAttempts.map((a) => a.percent)];
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100;

    return {
      courseId,
      courseTitle: course.title,
      eligible: lessonsComplete && quizzesPassed && examPassed,
      lessonsComplete,
      lessonsDone: doneLessons,
      lessonsRequired: requiredLessons.length,
      quizzesPassed,
      quizzesRequired: quizIds.length,
      examPassed,
      examRequired: examIds.length > 0,
      averageScore,
    };
  }

  forUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
    });
  }

  /** A single certificate, readable only by its owner. */
  async one(userId: string, id: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { course: { select: { id: true, title: true } }, school: { select: { name: true } } },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    if (cert.userId !== userId) throw new ForbiddenException('Not your certificate');
    return cert;
  }

  /**
   * Public verification by serial. Deliberately minimal: it confirms a
   * certificate exists and what it was for, without exposing the child's
   * account, email or any other identifier.
   */
  async verify(serial: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { serial },
      select: {
        serial: true,
        courseName: true,
        schoolName: true,
        gradeName: true,
        studentName: true,
        score: true,
        issuedAt: true,
      },
    });
    if (!cert) throw new NotFoundException('No certificate with that id');
    return { valid: true, ...cert };
  }
}

/** Shareable, non-guessable id printed on the certificate. */
function newSerial(): string {
  return 'KID-' + randomBytes(5).toString('hex').toUpperCase();
}
