import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { levelFromXp, xpForNextLevel, periodKeyFor } from '../gamification/level.util';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  dashboard(studentId: string) {
    return this.cache.wrap(`dash:student:${studentId}`, 30, () => this.buildDashboard(studentId));
  }

  private async buildDashboard(studentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, displayName: true, avatarUrl: true, avatarColor: true, role: true, schoolId: true, streak: true, wallet: true, grade: { select: { name: true } } } });
    if (!user) throw new NotFoundException();
    const wallet = user.wallet ?? { xp: 0, coins: 0, level: 1 };
    const level = levelFromXp(wallet.xp);
    const since = new Date(); since.setUTCDate(since.getUTCDate() - 6); since.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); weekStart.setUTCHours(0, 0, 0, 0);

    const [enrollments, lessonsCompleted, quizAgg, streakLogs, achievements, dailyMission, unread, leaderboard] = await Promise.all([
      this.prisma.courseEnrollment.findMany({ where: { studentId, status: { not: 'DROPPED' } }, orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } }, take: 8, select: { progressPercent: true, lessonsCompleted: true, status: true, lastActivityAt: true, lastLesson: { select: { id: true, title: true, order: true, xpReward: true } }, course: { select: { id: true, slug: true, title: true, thumbnailUrl: true, accent: true, world: true, subject: { select: { name: true, accent: true } }, grade: { select: { name: true } }, teacher: { select: { name: true } }, _count: { select: { lessons: { where: { status: 'PUBLISHED' } } } } } } } }),
      this.prisma.progress.count({ where: { userId: studentId, completed: true } }),
      this.prisma.quizAttempt.aggregate({ where: { studentId, status: { in: ['SUBMITTED', 'GRADED'] } }, _count: true, _avg: { percent: true } }),
      this.prisma.streakLog.findMany({ where: { userId: studentId, date: { gte: since } }, select: { date: true } }),
      this.prisma.userAchievement.findMany({ where: { userId: studentId, unlockedAt: { not: null } }, orderBy: { unlockedAt: 'desc' }, take: 4, select: { id: true, unlockedAt: true, progress: true, achievement: { select: { title: true, description: true, xpReward: true, requirement: true, badgeUrl: true } } } }),
      this.prisma.studentMission.findFirst({ where: { studentId, periodKey: periodKeyFor('DAILY'), mission: { kind: 'DAILY', active: true } }, include: { mission: true } }),
      this.prisma.notification.count({ where: { userId: studentId, read: false } }),
      this.leaderboard(studentId, 'class', 'week', 5),
    ]);

    const doneDays = new Set(streakLogs.map((s) => new Date(s.date).toISOString().slice(0, 10)));
    const todayKey = new Date().toISOString().slice(0, 10);
    const streakWeek = Array.from({ length: 7 }, (_, i) => { const d = new Date(since); d.setUTCDate(d.getUTCDate() + i); const k = d.toISOString().slice(0, 10); return { day: DAYS[d.getUTCDay()], date: k, done: doneDays.has(k), isToday: k === todayKey }; });

    const current = enrollments.find((e) => e.status === 'ACTIVE' && e.lastLesson) ?? enrollments[0];
    const courses = enrollments.map((e) => ({
      id: e.course.id, slug: e.course.slug, title: e.course.title, subject: e.course.subject?.name ?? 'General', subjectAccent: e.course.subject?.accent ?? e.course.accent,
      grade: e.course.grade?.name ?? null, teacher: e.course.teacher?.name ?? null, thumbnailUrl: e.course.thumbnailUrl, progressPercent: e.progressPercent,
      lessonsCompleted: e.lessonsCompleted, totalLessons: e.course._count.lessons, currentLesson: e.lastLesson ? { id: e.lastLesson.id, title: e.lastLesson.title, order: e.lastLesson.order } : null,
      lastActivityAt: e.lastActivityAt, status: e.status === 'COMPLETED' ? 'COMPLETED' : e.lessonsCompleted > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    }));

    return {
      profile: { id: user.id, name: user.name, displayName: user.displayName, avatarUrl: user.avatarUrl, avatarColor: user.avatarColor, role: user.role, schoolId: user.schoolId, level, xp: wallet.xp, xpForNextLevel: xpForNextLevel(level), coins: wallet.coins, streak: user.streak },
      stats: { coursesEnrolled: enrollments.length, lessonsCompleted, quizzesCompleted: quizAgg._count, averageScore: Math.round(quizAgg._avg.percent ?? 0) },
      adventure: current ? { world: current.course.world ?? 'MATH_ISLAND', level, nextLevel: level + 1, xp: wallet.xp, xpForNextLevel: xpForNextLevel(level), course: { id: current.course.id, slug: current.course.slug, title: current.course.title, subject: current.course.subject?.name ?? 'General' }, lesson: current.lastLesson ? { id: current.lastLesson.id, title: current.lastLesson.title, order: current.lastLesson.order, total: current.course._count.lessons, xpReward: current.lastLesson.xpReward } : null, progressPercent: current.progressPercent } : null,
      courses,
      dailyQuest: dailyMission ? this.questView(dailyMission) : null,
      streakWeek,
      achievements: achievements.map((a) => ({ id: a.id, title: a.achievement.title, description: a.achievement.description, xpReward: a.achievement.xpReward, unlockedAt: a.unlockedAt, progress: a.progress, requirement: a.achievement.requirement, badgeUrl: a.achievement.badgeUrl })),
      leaderboard: { period: 'week', entries: leaderboard },
      unreadNotifications: unread,
    };
  }

  async courses(studentId: string, status?: string) {
    const d = await this.buildDashboardCourses(studentId);
    return status ? d.filter((c) => c.status === status) : d;
  }
  private async buildDashboardCourses(studentId: string) { return (await this.buildDashboard(studentId)).courses; }

  async quests(studentId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { schoolId: true } });
    const now = new Date();
    const missions = await this.prisma.mission.findMany({ where: { active: true, OR: [{ schoolId: null }, { schoolId: user.schoolId }], AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: [{ kind: 'asc' }, { order: 'asc' }] });
    const keys = missions.map((m) => ({ missionId: m.id, periodKey: periodKeyFor(m.kind) }));
    const sms = await this.prisma.studentMission.findMany({ where: { studentId, OR: keys } });
    return missions.map((m) => { const sm = sms.find((s) => s.missionId === m.id && s.periodKey === periodKeyFor(m.kind)); return this.questView({ mission: m, progress: sm?.progress ?? 0, completed: sm?.completed ?? false, claimedAt: sm?.claimedAt ?? null }); });
  }
  private questView(sm: { mission: { id: string; kind: string; title: string; description: string; target: number; rewardXP: number; rewardCoins: number; endsAt: Date | null }; progress: number; completed: boolean; claimedAt: Date | null }) {
    return { id: sm.mission.id, kind: sm.mission.kind, title: sm.mission.title, description: sm.mission.description, progress: sm.progress, target: sm.mission.target, rewardXP: sm.mission.rewardXP, rewardCoins: sm.mission.rewardCoins, completed: sm.completed, claimed: !!sm.claimedAt, endsAt: sm.mission.endsAt };
  }

  async assignments(studentId: string, status?: string) {
    const classIds = (await this.prisma.classEnrollment.findMany({ where: { studentId, status: 'ACTIVE' }, select: { classId: true } })).map((c) => c.classId);
    const courseIds = (await this.prisma.courseEnrollment.findMany({ where: { studentId }, select: { courseId: true } })).map((c) => c.courseId);
    const rows = await this.prisma.assignment.findMany({ where: { status: { not: 'DRAFT' }, OR: [{ classId: { in: classIds } }, { courseId: { in: courseIds }, classId: null }] }, orderBy: { dueAt: 'asc' }, select: { id: true, title: true, description: true, dueAt: true, maxScore: true, course: { select: { title: true, subject: { select: { name: true, accent: true } } } }, teacher: { select: { name: true } }, submissions: { where: { studentId }, select: { status: true, score: true, feedback: true } } } });
    const now = Date.now(); const soon = now + 3 * 86400000;
    const list = rows.map((a) => { const s = a.submissions[0]; const st = s ? (s.status === 'GRADED' || s.status === 'RETURNED' ? 'GRADED' : 'SUBMITTED') : a.dueAt && a.dueAt.getTime() < now ? 'OVERDUE' : a.dueAt && a.dueAt.getTime() < soon ? 'PENDING' : 'UPCOMING';
      return { id: a.id, title: a.title, description: a.description, course: a.course?.title ?? null, subject: a.course?.subject?.name ?? null, subjectAccent: a.course?.subject?.accent, teacher: a.teacher.name, dueAt: a.dueAt, maxScore: a.maxScore, status: st, score: s?.score ?? null, feedback: s?.feedback ?? null }; });
    return status ? list.filter((a) => a.status === status) : list;
  }

  async quizzes(studentId: string, status?: string) {
    const courseIds = (await this.prisma.courseEnrollment.findMany({ where: { studentId }, select: { courseId: true } })).map((c) => c.courseId);
    const rows = await this.prisma.quiz.findMany({ where: { published: true, kind: { not: 'FINAL_EXAM' }, OR: [{ courseId: { in: courseIds } }, { lesson: { courseId: { in: courseIds } } }] }, select: { id: true, title: true, timeLimitSec: true, maxAttempts: true, course: { select: { title: true } }, lesson: { select: { course: { select: { title: true } } } }, _count: { select: { questions: true } }, attempts: { where: { studentId }, select: { status: true, percent: true } } } });
    const list = rows.map((z) => { const used = z.attempts.filter((a) => a.status !== 'IN_PROGRESS').length; const best = z.attempts.length ? Math.max(...z.attempts.map((a) => a.percent)) : null; const st = z.attempts.some((a) => a.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : used ? 'COMPLETED' : 'AVAILABLE';
      return { id: z.id, title: z.title, course: z.course?.title ?? z.lesson?.course.title ?? null, questionCount: z._count.questions, timeLimitSec: z.timeLimitSec, attemptsUsed: used, maxAttempts: z.maxAttempts, bestPercent: best, status: st }; });
    return status ? list.filter((q) => q.status === status) : list;
  }

  async exams(studentId: string) {
    const classIds = (await this.prisma.classEnrollment.findMany({ where: { studentId, status: 'ACTIVE' }, select: { classId: true } })).map((c) => c.classId);
    const courseIds = (await this.prisma.courseEnrollment.findMany({ where: { studentId }, select: { courseId: true } })).map((c) => c.courseId);
    const rows = await this.prisma.exam.findMany({ where: { status: { not: 'DRAFT' }, OR: [{ classId: { in: classIds } }, { classId: null, courseId: { in: courseIds } }] }, orderBy: { scheduledAt: 'asc' }, select: { id: true, title: true, scheduledAt: true, availableFrom: true, availableUntil: true, durationMin: true, status: true, course: { select: { title: true, certificates: { where: { userId: studentId }, select: { id: true } } } }, attempts: { where: { studentId, status: { not: 'IN_PROGRESS' } }, orderBy: { percent: 'desc' }, take: 1, select: { percent: true, passed: true } } } });
    return rows.map((e) => ({ id: e.id, title: e.title, course: e.course.title, scheduledAt: e.scheduledAt, availableFrom: e.availableFrom, availableUntil: e.availableUntil, durationMin: e.durationMin, status: e.attempts.length ? 'COMPLETED' : e.status, result: e.attempts[0] ? { percent: e.attempts[0].percent, passed: e.attempts[0].passed, certificateId: e.course.certificates[0]?.id ?? null } : null }));
  }

  certificates(studentId: string) {
    return this.prisma.certificate.findMany({ where: { userId: studentId, revoked: false }, orderBy: { issuedAt: 'desc' }, select: { id: true, code: true, courseName: true, studentName: true, schoolName: true, gradeName: true, issuedAt: true, pdfUrl: true } });
  }

  async achievements(studentId: string) {
    const rows = await this.prisma.achievement.findMany({ orderBy: { order: 'asc' }, include: { users: { where: { userId: studentId } } } });
    return rows.map((a) => ({ id: a.id, title: a.title, description: a.description, xpReward: a.xpReward, unlockedAt: a.users[0]?.unlockedAt ?? null, progress: a.users[0]?.progress ?? 0, requirement: a.requirement, badgeUrl: a.badgeUrl }));
  }

  async badges(studentId: string) {
    const rows = await this.prisma.badge.findMany({ include: { users: { where: { userId: studentId } } } });
    return rows.map((b) => ({ id: b.id, slug: b.slug, name: b.name, desc: b.desc, glyph: b.glyph, gradient: b.gradient, earnedAt: b.users[0]?.earnedAt ?? null, requirementText: b.desc }));
  }

  /** XP earned in the period, scoped to class or school. Display names only (privacy). */
  async leaderboard(studentId: string, scope: 'school' | 'class', period: 'week' | 'month', take = 50) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { schoolId: true, classEnrollments: { where: { status: 'ACTIVE' }, select: { classId: true }, take: 1 } } });
    const since = new Date(); since.setUTCDate(since.getUTCDate() - (period === 'week' ? 7 : 30));
    const classId = me.classEnrollments[0]?.classId;
    const scopeWhere = scope === 'class' && classId ? { classEnrollments: { some: { classId } } } : { schoolId: me.schoolId };
    return this.cache.wrap(`lb:${scope}:${scope === 'class' ? classId : me.schoolId}:${period}:${take}`, 60, async () => {
      const grouped = await this.prisma.transaction.groupBy({ by: ['userId'], where: { currency: 'XP', type: { in: ['EARN', 'BONUS'] }, createdAt: { gte: since }, user: { role: 'CHILD', ...scopeWhere } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take });
      const users = await this.prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true, displayName: true, avatarUrl: true, avatarColor: true } });
      return grouped.map((g, i) => { const u = users.find((x) => x.id === g.userId); return { rank: i + 1, userId: g.userId, displayName: u?.displayName ?? u?.name.split(' ')[0] ?? 'Learner', avatarUrl: u?.avatarUrl, avatarColor: u?.avatarColor, xp: g._sum.amount ?? 0, isMe: g.userId === studentId }; });
    }).then((rows) => rows.map((r) => ({ ...r, isMe: r.userId === studentId })));
  }

  /** World → course → section → lesson tree with lock state (game layer never blocks academics: only LOCKED when previous lesson unfinished). */
  async world(studentId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({ where: { studentId }, select: { progressPercent: true, course: { select: { id: true, slug: true, title: true, world: true, worldOrder: true, sections: { orderBy: { order: 'asc' }, select: { id: true, title: true, lessons: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' }, select: { id: true, title: true, type: true, progress: { where: { userId: studentId }, select: { completed: true } } } } } }, exams: { where: { status: { not: 'DRAFT' } }, select: { id: true, title: true, attempts: { where: { studentId, passed: true }, select: { id: true } } } } } } } });
    const worldMeta: Record<string, { name: string; accent: string }> = { READING_FOREST: { name: 'Reading Forest', accent: '#22C55E' }, MATH_ISLAND: { name: 'Math Island', accent: '#7C3AED' }, SCIENCE_PLANET: { name: 'Science Planet', accent: '#F59E0B' }, CODING_CITY: { name: 'Coding City', accent: '#3B82F6' }, ART_VALLEY: { name: 'Art Valley', accent: '#EC4899' } };
    const byWorld = new Map<string, { progress: number[]; nodes: unknown[] }>();
    for (const e of enrollments.sort((a, b) => a.course.worldOrder - b.course.worldOrder)) {
      const key = e.course.world ?? 'MATH_ISLAND';
      const w = byWorld.get(key) ?? { progress: [], nodes: [] }; w.progress.push(e.progressPercent);
      let prevDone = true;
      const sections = e.course.sections.map((s) => ({ id: s.id, type: 'SECTION', title: s.title, status: s.lessons.every((l) => l.progress[0]?.completed) && s.lessons.length ? 'COMPLETED' : 'AVAILABLE', children: s.lessons.map((l) => { const done = !!l.progress[0]?.completed; const node = { id: l.id, type: l.type === 'GAME' ? 'CHALLENGE' : 'LESSON', title: l.title, status: done ? 'COMPLETED' : prevDone ? 'AVAILABLE' : 'LOCKED', href: `/learn/${e.course.slug}/${l.id}` }; prevDone = done; return node; }) }));
      const boss = e.course.exams.map((x) => ({ id: x.id, type: 'BOSS', title: x.title, status: x.attempts.length ? 'COMPLETED' : e.progressPercent >= 100 ? 'AVAILABLE' : 'LOCKED', href: `/exam/${x.id}` }));
      w.nodes.push({ id: e.course.id, type: 'COURSE', title: e.course.title, status: e.progressPercent >= 100 ? 'COMPLETED' : 'AVAILABLE', href: `/learn/${e.course.slug}`, children: [...sections, ...boss] });
      byWorld.set(key, w);
    }
    return { worlds: [...byWorld.entries()].map(([key, w]) => ({ key, name: worldMeta[key]?.name ?? key, accent: worldMeta[key]?.accent ?? '#7C3AED', progress: Math.round(w.progress.reduce((a, b) => a + b, 0) / Math.max(1, w.progress.length)), nodes: w.nodes })) };
  }
}
