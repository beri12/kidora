import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Admin platform overview.
  async platform() {
    const [users, courses, payments, active] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.payment.count({ where: { status: 'succeeded' } }),
      this.prisma.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 864e5) } } }),
    ]);
    const revenueAgg = await this.prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: 'succeeded' } });
    return { totalUsers: users, coursesLive: courses, paidSubscriptions: payments, activeToday: active, revenueCents: revenueAgg._sum.amountCents ?? 0 };
  }

  // Parent report for one child (or the parent's own linked child).
  async childReport(userId: string) {
    const [completed, badges, certs, attempts] = await Promise.all([
      this.prisma.progress.count({ where: { userId, completed: true } }),
      this.prisma.userBadge.count({ where: { userId } }),
      this.prisma.certificate.count({ where: { userId } }),
      this.prisma.progress.findMany({ where: { userId }, include: { lesson: { include: { course: { include: { subject: true } } } } } }),
    ]);
    // rough per-subject mastery from completed lessons
    const bySubject: Record<string, { done: number; total: number }> = {};
    for (const p of attempts) {
      const s = p.lesson.course.subject?.name ?? 'Other';
      bySubject[s] ??= { done: 0, total: 0 };
      bySubject[s].total++;
      if (p.completed) bySubject[s].done++;
    }
    const mastery = Object.entries(bySubject).map(([name, v]) => ({ name, pct: Math.round((v.done / Math.max(1, v.total)) * 100) }));
    return { completedLessons: completed, badges, certificates: certs, mastery };
  }

  // =========================================================================
  // Educational telemetry
  // =========================================================================

  /**
   * Record one learning event. Deliberately narrow: a name, the pseudonymous
   * ids the platform already holds, and a small props bag. No device
   * fingerprints, no ad identifiers, nothing that would support behavioural
   * advertising to a child (PHASE 32/34 of KIDORA_UPDATE_PLAN.md).
   *
   * Analytics must never break a lesson, so failures are swallowed.
   */
  async track(
    name: string,
    ctx: { userId?: string | null; schoolId?: string | null; courseId?: string | null; props?: Record<string, unknown> } = {},
  ): Promise<void> {
    try {
      let schoolId = ctx.schoolId ?? null;
      if (!schoolId && ctx.userId) {
        const u = await this.prisma.user.findUnique({ where: { id: ctx.userId }, select: { schoolId: true } });
        schoolId = u?.schoolId ?? null;
      }
      await this.prisma.analyticsEvent.create({
        data: {
          name,
          userId: ctx.userId ?? null,
          schoolId,
          courseId: ctx.courseId ?? null,
          props: (ctx.props ?? {}) as any,
        },
      });
    } catch {
      // intentionally ignored — telemetry is best-effort
    }
  }

  /** Teacher dashboard rollup, scoped to the courses this teacher owns. */
  async teacherOverview(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: { teacherId },
      select: { id: true, title: true, published: true, _count: { select: { lessons: true, enrollments: true } } },
    });
    const courseIds = courses.map((c) => c.id);

    const [activeStudents, pendingSubmissions, upcomingExams, progressRows, quizRows] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: 'ACTIVE' } }),
      this.prisma.assignmentSubmission.count({
        where: { assignment: { teacherId }, status: 'SUBMITTED' },
      }),
      this.prisma.exam.count({ where: { teacherId, published: true } }),
      this.prisma.courseProgress.findMany({
        where: { courseId: { in: courseIds } },
        select: { percent: true, completed: true, studentId: true, courseId: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { status: 'SUBMITTED', quiz: { courseId: { in: courseIds } } },
        select: { percent: true, studentId: true },
        take: 2000,
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const avgProgress = progressRows.length
      ? Math.round(progressRows.reduce((a, r) => a + r.percent, 0) / progressRows.length)
      : 0;
    const completionRate = progressRows.length
      ? Math.round((progressRows.filter((r) => r.completed).length / progressRows.length) * 100)
      : 0;
    const averageScore = quizRows.length
      ? Math.round(quizRows.reduce((a, r) => a + r.percent, 0) / quizRows.length)
      : 0;

    // Framed as "needs support", never as a ranking shown to children.
    const strugglingIds = [
      ...new Set(progressRows.filter((r) => !r.completed && r.percent < 25).map((r) => r.studentId)),
    ].slice(0, 20);
    const needsSupport = strugglingIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: strugglingIds } },
          select: { id: true, name: true, avatarColor: true },
        })
      : [];

    return {
      courses,
      courseCount: courses.length,
      publishedCount: courses.filter((c) => c.published).length,
      activeStudents,
      pendingSubmissions,
      upcomingExams,
      avgProgress,
      completionRate,
      averageScore,
      needsSupport,
    };
  }

  /** Per-grade and per-subject breakdown for a school leader. */
  async schoolPerformance(schoolId: string) {
    const [grades, courses] = await Promise.all([
      this.prisma.grade.findMany({
        where: { OR: [{ schoolId }, { schoolId: null }] },
        select: { id: true, name: true },
      }),
      this.prisma.course.findMany({
        where: { schoolId },
        select: { id: true, gradeId: true, subject: { select: { name: true } } },
      }),
    ]);

    const progress = await this.prisma.courseProgress.findMany({
      where: { courseId: { in: courses.map((c) => c.id) } },
      select: { courseId: true, percent: true, completed: true },
    });
    const byCourse = new Map<string, { total: number; sum: number; done: number }>();
    for (const p of progress) {
      const row = byCourse.get(p.courseId) ?? { total: 0, sum: 0, done: 0 };
      row.total++;
      row.sum += p.percent;
      if (p.completed) row.done++;
      byCourse.set(p.courseId, row);
    }

    const roll = (ids: string[]) => {
      let total = 0, sum = 0, done = 0;
      for (const id of ids) {
        const r = byCourse.get(id);
        if (!r) continue;
        total += r.total; sum += r.sum; done += r.done;
      }
      return {
        learners: total,
        avgProgress: total ? Math.round(sum / total) : 0,
        completionRate: total ? Math.round((done / total) * 100) : 0,
      };
    };

    const bySubject = new Map<string, string[]>();
    for (const c of courses) {
      const key = c.subject?.name ?? 'Other';
      bySubject.set(key, [...(bySubject.get(key) ?? []), c.id]);
    }

    return {
      byGrade: grades.map((g) => ({
        id: g.id,
        name: g.name,
        ...roll(courses.filter((c) => c.gradeId === g.id).map((c) => c.id)),
      })),
      bySubject: [...bySubject.entries()].map(([name, ids]) => ({ name, ...roll(ids) })),
    };
  }
}
