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
}
