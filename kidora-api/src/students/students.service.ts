import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseAccessService } from '../courses/course-access.service';
import { EconomyService } from '../economy/economy.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AppRole } from '../common/enums/role.enum';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly economy: EconomyService,
  ) {}

  /**
   * Recompute a learner's rolled-up progress for one course and cache it on
   * CourseProgress. Called after each lesson completion rather than on read, so
   * dashboards stay cheap.
   */
  async recomputeCourseProgress(studentId: string, courseId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const lessonIds = lessons.map((l) => l.id);
    const done = lessonIds.length
      ? await this.prisma.progress.count({
          where: { userId: studentId, completed: true, lessonId: { in: lessonIds } },
        })
      : 0;

    const percent = lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0;
    const completed = lessonIds.length > 0 && done >= lessonIds.length;

    return this.prisma.courseProgress.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      update: {
        percent,
        lessonsCompleted: done,
        lessonsTotal: lessonIds.length,
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        courseId,
        studentId,
        percent,
        lessonsCompleted: done,
        lessonsTotal: lessonIds.length,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  /** Everything the student home screen needs, in one round trip. */
  async home(tenant: TenantContext) {
    const [user, wallet, inProgress, badges, certificates, streakEvents] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: tenant.userId },
        select: {
          id: true, name: true, avatarColor: true, avatarUrl: true, points: true, streak: true,
          grade: { select: { id: true, name: true } },
          school: { select: { id: true, name: true } },
          avatar: true,
        },
      }),
      this.economy.wallet(tenant.userId),
      this.prisma.courseProgress.findMany({
        where: { studentId: tenant.userId, completed: false, percent: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: {
          course: {
            select: {
              id: true, title: true, thumbnailUrl: true, gradient: true, accent: true,
              subject: { select: { slug: true, name: true } },
            },
          },
        },
      }),
      this.prisma.userBadge.findMany({
        where: { userId: tenant.userId },
        orderBy: { earnedAt: 'desc' },
        take: 8,
        include: { badge: true },
      }),
      this.prisma.certificate.count({ where: { userId: tenant.userId } }),
      this.prisma.xpEvent.findMany({
        where: { studentId: tenant.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    if (!user) throw new NotFoundException('Student not found');

    // Recommended = published, in the learner's reach, not started yet.
    const startedIds = (
      await this.prisma.courseProgress.findMany({
        where: { studentId: tenant.userId },
        select: { courseId: true },
      })
    ).map((p) => p.courseId);

    const recommended = await this.prisma.course.findMany({
      where: { AND: [this.access.learnerFilter(tenant), { id: { notIn: startedIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, title: true, description: true, thumbnailUrl: true, gradient: true, accent: true,
        subject: { select: { slug: true, name: true, accent: true } },
        _count: { select: { lessons: true } },
      },
    });

    const xpForNextLevel = wallet.level * 500;
    return {
      profile: {
        id: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl,
        avatar: user.avatar,
        grade: user.grade,
        school: user.school,
        streak: user.streak,
      },
      wallet: {
        coins: wallet.coins,
        gems: wallet.gems,
        xp: wallet.xp,
        level: wallet.level,
        xpForNextLevel,
        xpIntoLevel: wallet.xp - (wallet.level - 1) * 500,
      },
      inProgress,
      recommended,
      badges: badges.map((b) => b.badge),
      certificates,
      recentXp: streakEvents,
    };
  }

  /** Course-by-course progress for the learner. */
  async progress(tenant: TenantContext) {
    const rows = await this.prisma.courseProgress.findMany({
      where: { studentId: tenant.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true, title: true, thumbnailUrl: true,
            subject: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const [quizzes, exams, submissions] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { studentId: tenant.userId, status: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
        take: 50,
        include: { quiz: { select: { id: true, title: true } } },
      }),
      this.prisma.examAttempt.findMany({
        where: { studentId: tenant.userId, status: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        include: { exam: { select: { id: true, title: true } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId: tenant.userId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        include: { assignment: { select: { id: true, title: true, points: true } } },
      }),
    ]);

    return { courses: rows, quizzes, exams, assignments: submissions };
  }

  /**
   * Parent view of one child. A parent may only read a child that is linked to
   * them; the link is checked in the database, never assumed from the request.
   */
  async childReport(tenant: TenantContext, childId: string) {
    if (tenant.role !== AppRole.PARENT && !tenant.isPlatformAdmin) {
      throw new ForbiddenException('Only a parent can read a child report');
    }
    if (!tenant.isPlatformAdmin) {
      const linked = await this.isLinkedChild(tenant.userId, childId);
      if (!linked) throw new ForbiddenException('This child is not linked to your account');
    }

    const [child, wallet, courses, certificates, badges, quizzes, exams, assignments] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: childId },
          select: {
            id: true, name: true, avatarColor: true, streak: true, points: true,
            grade: { select: { name: true } }, school: { select: { name: true } },
          },
        }),
        this.prisma.rewardWallet.findUnique({ where: { userId: childId } }),
        this.prisma.courseProgress.findMany({
          where: { studentId: childId },
          include: { course: { select: { id: true, title: true, subject: { select: { name: true } } } } },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.certificate.findMany({ where: { userId: childId }, orderBy: { issuedAt: 'desc' } }),
        this.prisma.userBadge.findMany({ where: { userId: childId }, include: { badge: true } }),
        this.prisma.quizAttempt.findMany({
          where: { studentId: childId, status: 'SUBMITTED' },
          orderBy: { submittedAt: 'desc' }, take: 20,
          include: { quiz: { select: { title: true } } },
        }),
        this.prisma.examAttempt.findMany({
          where: { studentId: childId, status: 'SUBMITTED' },
          orderBy: { submittedAt: 'desc' }, take: 10,
          include: { exam: { select: { title: true } } },
        }),
        this.prisma.assignmentSubmission.findMany({
          where: { studentId: childId },
          orderBy: { submittedAt: 'desc' }, take: 20,
          include: { assignment: { select: { title: true, points: true, dueAt: true } } },
        }),
      ]);
    if (!child) throw new NotFoundException('Child not found');

    const scores = quizzes.map((q) => q.percent);
    return {
      child,
      xp: wallet?.xp ?? 0,
      level: wallet?.level ?? 1,
      streak: child.streak,
      courses,
      certificates,
      badges: badges.map((b) => b.badge),
      quizzes,
      exams,
      assignments,
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    };
  }

  /** The children a parent may read: linked accounts plus local child profiles. */
  async myChildren(tenant: TenantContext) {
    const [profiles, accounts] = await Promise.all([
      this.prisma.childProfile.findMany({ where: { parentId: tenant.userId } }),
      this.linkedChildAccounts(tenant.userId),
    ]);
    return { profiles, accounts };
  }

  /**
   * A ChildProfile is a parent-owned record, not a login. A child *account* is
   * linked when a ChildProfile of the same name exists under this parent — the
   * data model has no direct parent→child-user foreign key, so this is the
   * conservative reading rather than inventing a new relation.
   */
  private async linkedChildAccounts(parentId: string) {
    const profiles = await this.prisma.childProfile.findMany({
      where: { parentId },
      select: { name: true },
    });
    if (profiles.length === 0) return [];
    return this.prisma.user.findMany({
      where: { role: 'CHILD', name: { in: profiles.map((p) => p.name) } },
      select: { id: true, name: true, avatarColor: true, points: true, streak: true },
    });
  }

  private async isLinkedChild(parentId: string, childId: string): Promise<boolean> {
    const accounts = await this.linkedChildAccounts(parentId);
    return accounts.some((a) => a.id === childId);
  }
}
