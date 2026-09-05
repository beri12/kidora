import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { TenancyService } from '../common/tenancy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { StudentService } from '../student/student.service';
import { PaginationDto, paginate, skip } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Static for now, structured for CMS later (spec §53). */
const PARENT_TIPS = [
  { id: 'space', title: 'Create a Study Space', body: 'A quiet space helps focus better.', icon: 'home' },
  { id: 'wins', title: 'Celebrate Small Wins', body: "Praise builds your child's confidence.", icon: 'trophy' },
  { id: 'together', title: 'Learn Together', body: 'Spend time learning together.', icon: 'users' },
  { id: 'consistent', title: 'Stay Consistent', body: 'Daily practice creates success.', icon: 'calendar' },
];

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService, private cache: CacheService, private tenancy: TenancyService, private analytics: AnalyticsService, private students: StudentService) {}

  children(parentId: string) {
    return this.prisma.parentStudent.findMany({ where: { parentId }, orderBy: { createdAt: 'asc' }, select: { student: { select: { id: true, name: true, displayName: true, avatarUrl: true, avatarColor: true, grade: { select: { name: true } }, school: { select: { name: true } }, classEnrollments: { where: { status: 'ACTIVE' }, take: 1, select: { class: { select: { name: true } } } } } } } })
      .then((rows) => rows.map((r) => ({ id: r.student.id, name: r.student.name, displayName: r.student.displayName, avatarUrl: r.student.avatarUrl, avatarColor: r.student.avatarColor, grade: r.student.grade?.name ?? null, className: r.student.classEnrollments[0]?.class.name ?? null, schoolName: r.student.school?.name ?? null })));
  }

  async dashboard(u: AuthUser, childId?: string, range?: string) {
    const kids = await this.children(u.id);
    const child = childId ? kids.find((k) => k.id === childId) : kids[0];
    if (childId && !child) await this.tenancy.assertParentOf(u.id, childId); // throws 403
    if (!child) return { parent: await this.parentProfile(u.id), children: [], selectedChildId: '', range: { from: new Date(), to: new Date() }, kpis: null, subjectProgress: [], weeklyActivity: { labels: [], minutes: [], totalMinutes: 0, lessons: 0, quizzes: 0, assignments: 0 }, achievements: [], upcomingAssignments: [], insights: { strengths: [], needsPractice: [] }, messages: [], tips: PARENT_TIPS, unreadNotifications: 0 };
    return this.cache.wrap(`dash:parent:${u.id}:${child.id}:${range ?? 'week'}`, 60, () => this.build(u, child.id, kids, range));
  }

  private parentProfile(id: string) { return this.prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, avatarUrl: true, avatarColor: true, role: true, schoolId: true } }); }

  private async build(u: AuthUser, sid: string, kids: Awaited<ReturnType<ParentService['children']>>, range?: string) {
    const from = this.analytics.rangeFrom(range); const prevFrom = new Date(from.getTime() - (Date.now() - from.getTime()));
    const [parent, student, wallet, lessonsNow, lessonsPrev, quizNow, quizPrev, coinsNow, logs, achievements, assignments, insights, messages, unread, subjectProgress, submissions] = await Promise.all([
      this.parentProfile(u.id),
      this.prisma.user.findUniqueOrThrow({ where: { id: sid }, select: { streak: true, schoolId: true } }),
      this.prisma.rewardWallet.findUnique({ where: { userId: sid } }),
      this.prisma.progress.count({ where: { userId: sid, completed: true, completedAt: { gte: from } } }),
      this.prisma.progress.count({ where: { userId: sid, completed: true, completedAt: { gte: prevFrom, lt: from } } }),
      this.prisma.quizAttempt.aggregate({ where: { studentId: sid, status: { in: ['SUBMITTED', 'GRADED'] }, submittedAt: { gte: from } }, _avg: { percent: true }, _count: true }),
      this.prisma.quizAttempt.aggregate({ where: { studentId: sid, status: { in: ['SUBMITTED', 'GRADED'] }, submittedAt: { gte: prevFrom, lt: from } }, _avg: { percent: true } }),
      this.prisma.transaction.aggregate({ where: { userId: sid, currency: 'COINS', type: 'EARN', createdAt: { gte: from } }, _sum: { amount: true } }),
      this.prisma.streakLog.findMany({ where: { userId: sid, date: { gte: from } }, orderBy: { date: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId: sid, unlockedAt: { not: null } }, orderBy: { unlockedAt: 'desc' }, take: 4, select: { id: true, unlockedAt: true, progress: true, achievement: { select: { title: true, description: true, xpReward: true, requirement: true, badgeUrl: true } } } }),
      this.students.assignments(sid),
      this.insights(sid),
      this.teacherMessages(u.id, sid),
      this.prisma.notification.count({ where: { userId: u.id, read: false } }),
      this.analytics.subjectPerformance([sid]),
      this.prisma.assignmentSubmission.count({ where: { studentId: sid, submittedAt: { gte: from } } }),
    ]);
    const overall = await this.prisma.courseEnrollment.aggregate({ where: { studentId: sid, status: { not: 'DROPPED' } }, _avg: { progressPercent: true } });
    const days: string[] = []; for (let d = new Date(from); d <= new Date(); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    const minutes = days.map((d) => logs.find((l) => l.date.toISOString().slice(0, 10) === d)?.minutes ?? 0);
    const quizAvg = Math.round(quizNow._avg.percent ?? 0); const quizPrevAvg = Math.round(quizPrev._avg.percent ?? 0);
    return {
      parent, children: kids, selectedChildId: sid, range: { from, to: new Date() },
      kpis: {
        overallProgress: { value: Math.round(overall._avg.progressPercent ?? 0), unit: 'percent', trend: { delta: lessonsNow - lessonsPrev, label: 'lessons vs previous period', series: minutes } },
        lessonsCompleted: { value: lessonsNow, unit: 'count', trend: { delta: lessonsNow - lessonsPrev, label: 'vs previous period', series: days.map((d) => logs.find((l) => l.date.toISOString().slice(0, 10) === d)?.lessons ?? 0) } },
        quizAverage: { value: quizAvg, unit: 'percent', trend: quizNow._count ? { delta: quizAvg - quizPrevAvg, label: 'vs previous period' } : undefined },
        streak: { value: student.streak, unit: 'days' },
        coins: { value: wallet?.coins ?? 0, unit: 'coins', trend: { delta: coinsNow._sum.amount ?? 0, label: 'earned this period' } },
      },
      subjectProgress: subjectProgress.map((s) => ({ subject: s.subject, accent: s.accent, percent: s.completion })),
      weeklyActivity: { labels: days.map((d) => (days.length <= 7 ? DAYS[new Date(d).getUTCDay()] : d.slice(5))), minutes, totalMinutes: minutes.reduce((a, b) => a + b, 0), lessons: lessonsNow, quizzes: quizNow._count, assignments: submissions },
      achievements: achievements.map((a) => ({ id: a.id, title: a.achievement.title, description: a.achievement.description, xpReward: a.achievement.xpReward, unlockedAt: a.unlockedAt, progress: a.progress, requirement: a.achievement.requirement, badgeUrl: a.achievement.badgeUrl })),
      upcomingAssignments: assignments.filter((a) => a.status === 'UPCOMING' || a.status === 'PENDING' || a.status === 'OVERDUE').slice(0, 5),
      insights, messages, tips: PARENT_TIPS, unreadNotifications: unread,
    };
  }

  /** Educational language only: topics (sections) with best score ≥ 80 are strengths, < 60 need practice. */
  private async insights(sid: string) {
    const att = await this.prisma.quizAttempt.findMany({ where: { studentId: sid, status: { in: ['SUBMITTED', 'GRADED'] } }, select: { percent: true, quiz: { select: { title: true, lesson: { select: { section: { select: { title: true } } } } } } } });
    const best = new Map<string, number>();
    for (const a of att) { const k = a.quiz.lesson?.section?.title ?? a.quiz.title; best.set(k, Math.max(best.get(k) ?? 0, a.percent)); }
    const strengths = [...best].filter(([, v]) => v >= 80).map(([k]) => k).slice(0, 4);
    const needsPractice = [...best].filter(([, v]) => v < 60).map(([k]) => k).slice(0, 4);
    return { strengths, needsPractice, tip: needsPractice[0] ? `Tip: Practice ${needsPractice[0].toLowerCase()} with real-life examples at home.` : null };
  }

  private async teacherMessages(parentId: string, studentId: string) {
    const convs = await this.prisma.conversation.findMany({ where: { studentId, members: { some: { userId: parentId } } }, select: { id: true, members: { select: { userId: true, lastReadAt: true } }, messages: { where: { senderId: { not: parentId } }, orderBy: { createdAt: 'desc' }, take: 1 } } });
    const teacherIds = convs.flatMap((c) => c.members.filter((m) => m.userId !== parentId).map((m) => m.userId));
    const teachers = await this.prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, avatarUrl: true } });
    return convs.filter((c) => c.messages[0]).map((c) => { const t = teachers.find((x) => x.id === c.members.find((m) => m.userId !== parentId)?.userId); const me = c.members.find((m) => m.userId === parentId)!; const m = c.messages[0]; return { id: m.id, conversationId: c.id, teacher: { name: t?.name ?? 'Teacher', avatarUrl: t?.avatarUrl }, preview: m.body.slice(0, 120), unread: !me.lastReadAt || m.createdAt > me.lastReadAt, createdAt: m.createdAt }; }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  }

  // ---- per-child endpoints: every one starts with assertParentOf
  async progress(u: AuthUser, sid: string) { await this.tenancy.assertParentOf(u.id, sid); return (await this.analytics.subjectPerformance([sid])).map((s) => ({ subject: s.subject, accent: s.accent, percent: s.completion })); }
  async activity(u: AuthUser, sid: string, q: PaginationDto) {
    await this.tenancy.assertParentOf(u.id, sid);
    const where = { userId: sid };
    const [rows, total, s] = await Promise.all([this.prisma.activityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: skip(q), take: q.pageSize }), this.prisma.activityEvent.count({ where }), this.prisma.user.findUniqueOrThrow({ where: { id: sid }, select: { id: true, name: true, avatarUrl: true, avatarColor: true } })]);
    return paginate(rows.map((r) => ({ id: r.id, type: r.type, title: r.title, xpDelta: r.xpDelta, createdAt: r.createdAt, actor: s })), total, q);
  }
  async assignments(u: AuthUser, sid: string, status?: string) { await this.tenancy.assertParentOf(u.id, sid); return this.students.assignments(sid, status); }
  async assessments(u: AuthUser, sid: string) { await this.tenancy.assertParentOf(u.id, sid); const [quizzes, exams] = await Promise.all([this.students.quizzes(sid), this.students.exams(sid)]); return { quizzes, exams }; }
  async achievements(u: AuthUser, sid: string) { await this.tenancy.assertParentOf(u.id, sid); return this.students.achievements(sid); }

  /** Link a child by the school-issued code stored on the student (displayName is not a secret; use a real invite code in your auth flow). */
  async link(u: AuthUser, studentId: string) {
    const s = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true } });
    if (!s || s.role !== 'CHILD') throw new NotFoundException('Student not found.');
    return this.prisma.parentStudent.upsert({ where: { parentId_studentId: { parentId: u.id, studentId } }, create: { parentId: u.id, studentId, verified: false }, update: {} });
  }
}
