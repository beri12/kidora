import { Injectable } from '@nestjs/common';
import type { MissionMetric, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../common/activity.service';
import { CacheService } from '../common/cache.service';
import { levelFromXp, periodKeyFor, todayDate } from './level.util';
import { CompletionService } from '../learning/completion.service';

type Tx = Prisma.TransactionClient;
export interface RewardOutcome { xp: number; coins: number; leveledUp: boolean; newLevel: number; unlockedAchievements: string[]; completedQuests: string[]; }

/**
 * Reusable reward pipeline (spec §11). One transaction:
 *   grant XP/coins (idempotent via Transaction.sourceKey)
 *   → streak → quest progress → achievement check → notification → activity feed.
 */
@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService, private activity: ActivityService, private cache: CacheService, private completion: CompletionService) {}

  /** Lesson completed by a student. Safe to call twice: second call is a no-op. */
  async onLessonCompleted(studentId: string, lessonId: string, timeSpentSec = 0) {
    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { id: true, title: true, xpReward: true, coinReward: true, courseId: true, course: { select: { schoolId: true, subject: { select: { slug: true } } } } } });
      const progress = await tx.progress.upsert({
        where: { userId_lessonId: { userId: studentId, lessonId } },
        create: { userId: studentId, lessonId, completed: true, percent: 100, completedAt: new Date(), timeSpentSec },
        update: { completed: true, percent: 100, completedAt: new Date(), timeSpentSec: { increment: timeSpentSec } },
      });
      if (progress.rewarded) return this.emptyOutcome(tx, studentId);
      await tx.progress.update({ where: { id: progress.id }, data: { rewarded: true } });
      await this.rollupCourse(tx, studentId, lesson.courseId, lessonId);
      const out = await this.grant(tx, studentId, { xp: lesson.xpReward, coins: lesson.coinReward, sourceKey: `lesson:${lessonId}:${studentId}`, description: `Completed ${lesson.title}` });
      await this.touchStreak(tx, studentId, { lessons: 1, minutes: Math.round(timeSpentSec / 60) });
      out.completedQuests = await this.advanceQuests(tx, studentId, [{ metric: 'LESSONS_COMPLETED', by: 1 }, { metric: 'SUBJECT_LESSONS', by: 1, subjectSlug: lesson.course.subject?.slug ?? undefined }, { metric: 'MINUTES_STUDIED', by: Math.round(timeSpentSec / 60) }]);
      out.unlockedAchievements = await this.checkAchievements(tx, studentId);
      await this.activity.log({ userId: studentId, schoolId: lesson.course.schoolId, type: 'LESSON_COMPLETED', title: `Completed lesson: ${lesson.title}`, entityType: 'lesson', entityId: lessonId, xpDelta: lesson.xpReward }, tx);
      await this.invalidate(studentId);
      return out;
    });
  }

  /** Quiz graded (called by QuizzesService after scoring). */
  async onQuizSubmitted(studentId: string, p: { quizId: string; attemptId: string; title: string; percent: number; xpReward: number; schoolId?: string | null; isExam: boolean; courseId?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const xp = Math.round(p.xpReward * Math.max(0.25, p.percent / 100));
      const out = await this.grant(tx, studentId, { xp, coins: Math.round(xp / 4), sourceKey: `attempt:${p.attemptId}`, description: `${p.isExam ? 'Exam' : 'Quiz'}: ${p.title} (${p.percent}%)` });
      await this.touchStreak(tx, studentId, { quizzes: 1 });
      out.completedQuests = await this.advanceQuests(tx, studentId, [{ metric: 'QUIZZES_COMPLETED', by: 1 }, ...(p.percent >= 80 ? [{ metric: 'QUIZ_SCORE_ABOVE' as MissionMetric, by: 1 }] : [])]);
      out.unlockedAchievements = await this.checkAchievements(tx, studentId);
      await this.activity.log({ userId: studentId, schoolId: p.schoolId, type: p.isExam ? 'EXAM_COMPLETED' : 'QUIZ_SUBMITTED', title: `Scored ${p.percent}% on ${p.title}`, entityType: 'quiz', entityId: p.quizId, xpDelta: xp }, tx);
      // Passing a required quiz or the final exam can be the last thing
      // standing between the student and course completion.
      if (p.courseId) await this.completion.sync(tx, studentId, p.courseId);
      await this.invalidate(studentId);
      return out;
    });
  }

  async onAssignmentSubmitted(studentId: string, p: { assignmentId: string; submissionId: string; title: string; xpReward: number; schoolId?: string | null; courseId?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const out = await this.grant(tx, studentId, { xp: p.xpReward, coins: Math.round(p.xpReward / 5), sourceKey: `submission:${p.submissionId}`, description: `Submitted ${p.title}` });
      out.completedQuests = await this.advanceQuests(tx, studentId, [{ metric: 'ASSIGNMENTS_SUBMITTED', by: 1 }]);
      out.unlockedAchievements = await this.checkAchievements(tx, studentId);
      await this.activity.log({ userId: studentId, schoolId: p.schoolId, type: 'ASSIGNMENT_SUBMITTED', title: `Completed assignment: ${p.title}`, entityType: 'assignment', entityId: p.assignmentId, xpDelta: p.xpReward }, tx);
      if (p.courseId) await this.completion.sync(tx, studentId, p.courseId);
      await this.invalidate(studentId);
      return out;
    });
  }

  /** Claim a completed quest once. Throws if already claimed or not complete. */
  async claimQuest(studentId: string, missionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const m = await tx.mission.findUniqueOrThrow({ where: { id: missionId } });
      const periodKey = periodKeyFor(m.kind);
      const sm = await tx.studentMission.findUnique({ where: { studentId_missionId_periodKey: { studentId, missionId, periodKey } } });
      if (!sm?.completed) throw new Error('Quest is not complete yet.');
      if (sm.claimedAt) throw new Error('Reward already claimed.');
      await tx.studentMission.update({ where: { id: sm.id }, data: { claimedAt: new Date() } });
      const out = await this.grant(tx, studentId, { xp: m.rewardXP, coins: m.rewardCoins, sourceKey: `quest:${sm.id}`, description: `Quest: ${m.title}` });
      await this.activity.log({ userId: studentId, type: 'QUEST_COMPLETED', title: `Completed quest: ${m.title}`, entityType: 'mission', entityId: missionId, xpDelta: m.rewardXP }, tx);
      await this.invalidate(studentId);
      return { ...sm, claimedAt: new Date(), outcome: out };
    });
  }

  // ------------------------------------------------------------------ internals

  private async grant(tx: Tx, userId: string, p: { xp: number; coins: number; sourceKey: string; description: string }): Promise<RewardOutcome> {
    const existing = await tx.transaction.findUnique({ where: { sourceKey: p.sourceKey }, select: { id: true } });
    if (existing) return this.emptyOutcome(tx, userId);
    const wallet = await tx.rewardWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const before = wallet.level;
    const xp = wallet.xp + p.xp; const level = levelFromXp(xp);
    await tx.rewardWallet.update({ where: { userId }, data: { xp, coins: { increment: p.coins }, level } });
    await tx.user.update({ where: { id: userId }, data: { points: { increment: p.xp }, lastActiveAt: new Date() } });
    await tx.transaction.create({ data: { userId, type: 'EARN', amount: p.xp, currency: 'XP', sourceKey: p.sourceKey, description: p.description } });
    if (p.coins) await tx.transaction.create({ data: { userId, type: 'EARN', amount: p.coins, currency: 'COINS', sourceKey: `${p.sourceKey}:coins`, description: p.description } });
    const leveledUp = level > before;
    if (leveledUp) {
      await tx.notification.create({ data: { userId, type: 'LEVEL_UP', title: `Level ${level}!`, body: `You reached level ${level}. Keep going!` } });
      await this.activity.log({ userId, type: 'LEVEL_UP', title: `Reached level ${level}` }, tx);
      await this.advanceQuests(tx, userId, [{ metric: 'XP_EARNED', by: p.xp }]);
    }
    return { xp: p.xp, coins: p.coins, leveledUp, newLevel: level, unlockedAchievements: [], completedQuests: [] };
  }

  private async emptyOutcome(tx: Tx, userId: string): Promise<RewardOutcome> {
    const w = await tx.rewardWallet.findUnique({ where: { userId }, select: { level: true } });
    return { xp: 0, coins: 0, leveledUp: false, newLevel: w?.level ?? 1, unlockedAchievements: [], completedQuests: [] };
  }

  private async rollupCourse(tx: Tx, studentId: string, courseId: string, lastLessonId: string) {
    // Completion is not "all lessons ticked" — a course can also require its
    // quizzes, assignments or final exam. CompletionService owns that decision
    // and writes the enrollment row (and the certificate) to match.
    const { justCompleted } = await this.completion.sync(tx, studentId, courseId, lastLessonId);
    if (justCompleted) {
      const c = await tx.course.findUniqueOrThrow({ where: { id: courseId }, select: { title: true, xpReward: true, schoolId: true } });
      await this.grant(tx, studentId, { xp: c.xpReward, coins: Math.round(c.xpReward / 4), sourceKey: `course:${courseId}:${studentId}`, description: `Finished ${c.title}` });
      await this.advanceQuests(tx, studentId, [{ metric: 'COURSES_COMPLETED', by: 1 }]);
      await this.activity.log({ userId: studentId, schoolId: c.schoolId, type: 'COURSE_COMPLETED', title: `Finished course: ${c.title}`, entityType: 'course', entityId: courseId }, tx);
    }
  }

  private async touchStreak(tx: Tx, userId: string, inc: { lessons?: number; quizzes?: number; minutes?: number }) {
    const today = todayDate();
    await tx.streakLog.upsert({ where: { userId_date: { userId, date: today } }, create: { userId, date: today, lessons: inc.lessons ?? 0, quizzes: inc.quizzes ?? 0, minutes: inc.minutes ?? 0 }, update: { lessons: { increment: inc.lessons ?? 0 }, quizzes: { increment: inc.quizzes ?? 0 }, minutes: { increment: inc.minutes ?? 0 } } });
    const wallet = await tx.rewardWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const last = wallet.lastStreakDate ? new Date(wallet.lastStreakDate) : null;
    if (last && last.getTime() === today.getTime()) return;
    const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { streak: true } });
    const streak = last && last.getTime() === yesterday.getTime() ? user.streak + 1 : 1;
    await tx.user.update({ where: { id: userId }, data: { streak } });
    await tx.rewardWallet.update({ where: { userId }, data: { lastStreakDate: today, longestStreak: Math.max(wallet.longestStreak, streak) } });
    await this.advanceQuests(tx, userId, [{ metric: 'STREAK_DAYS', by: 0, absolute: streak }]);
    if (streak > 1) await this.activity.log({ userId, type: 'STREAK_EXTENDED', title: `${streak}-day learning streak` }, tx);
  }

  /** Increment progress of every active quest matching the metric; mark complete when target reached. */
  private async advanceQuests(tx: Tx, studentId: string, deltas: { metric: MissionMetric; by: number; absolute?: number; subjectSlug?: string }[]): Promise<string[]> {
    const student = await tx.user.findUniqueOrThrow({ where: { id: studentId }, select: { schoolId: true } });
    const now = new Date();
    const missions = await tx.mission.findMany({ where: { active: true, metric: { in: deltas.map((d) => d.metric) }, OR: [{ schoolId: null }, { schoolId: student.schoolId }], AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } });
    const completed: string[] = [];
    for (const m of missions) {
      const d = deltas.find((x) => x.metric === m.metric && (m.metric !== 'SUBJECT_LESSONS' || !m.subjectSlug || m.subjectSlug === x.subjectSlug));
      if (!d) continue;
      const periodKey = periodKeyFor(m.kind);
      const sm = await tx.studentMission.upsert({ where: { studentId_missionId_periodKey: { studentId, missionId: m.id, periodKey } }, create: { studentId, missionId: m.id, periodKey, progress: 0 }, update: {} });
      if (sm.completed) continue;
      const progress = d.absolute !== undefined ? Math.max(sm.progress, d.absolute) : sm.progress + d.by;
      const done = progress >= m.target;
      await tx.studentMission.update({ where: { id: sm.id }, data: { progress: Math.min(progress, m.target), completed: done, completedAt: done ? now : null } });
      if (done) { completed.push(m.id); await tx.notification.create({ data: { userId: studentId, type: 'ACHIEVEMENT', title: 'Quest complete!', body: `${m.title} — claim your reward.`, link: '/student/quests' } }); }
    }
    return completed;
  }

  /** Evaluate all achievements against current counters; unlock new ones. */
  private async checkAchievements(tx: Tx, studentId: string): Promise<string[]> {
    const [achievements, unlocked, wallet, counts] = await Promise.all([
      tx.achievement.findMany(),
      tx.userAchievement.findMany({ where: { userId: studentId }, select: { achievementId: true, unlockedAt: true } }),
      tx.rewardWallet.findUnique({ where: { userId: studentId } }),
      this.counters(tx, studentId),
    ]);
    const map = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));
    const out: string[] = [];
    for (const a of achievements) {
      if (map.get(a.id)) continue;
      const value = counts[a.metric] ?? 0;
      const done = value >= a.requirement;
      await tx.userAchievement.upsert({ where: { userId_achievementId: { userId: studentId, achievementId: a.id } }, create: { userId: studentId, achievementId: a.id, progress: Math.min(value, a.requirement), unlockedAt: done ? new Date() : null }, update: { progress: Math.min(value, a.requirement), unlockedAt: done ? new Date() : null } });
      if (done) {
        out.push(a.title);
        if (a.xpReward && wallet) await this.grant(tx, studentId, { xp: a.xpReward, coins: 0, sourceKey: `achievement:${a.id}:${studentId}`, description: `Achievement: ${a.title}` });
        await tx.notification.create({ data: { userId: studentId, type: 'ACHIEVEMENT', title: 'Achievement unlocked!', body: a.title, link: '/student/badges' } });
        await this.activity.log({ userId: studentId, type: 'ACHIEVEMENT_UNLOCKED', title: `Earned badge: ${a.title}`, entityType: 'achievement', entityId: a.id, xpDelta: a.xpReward }, tx);
      }
    }
    return out;
  }

  private async counters(tx: Tx, userId: string): Promise<Partial<Record<MissionMetric, number>>> {
    const [lessons, quizzes, high, assignments, courses, user, wallet, minutes] = await Promise.all([
      tx.progress.count({ where: { userId, completed: true } }),
      tx.quizAttempt.count({ where: { studentId: userId, status: { in: ['SUBMITTED', 'GRADED'] } } }),
      tx.quizAttempt.count({ where: { studentId: userId, percent: { gte: 80 } } }),
      tx.assignmentSubmission.count({ where: { studentId: userId } }),
      tx.courseEnrollment.count({ where: { studentId: userId, status: 'COMPLETED' } }),
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { streak: true } }),
      tx.rewardWallet.findUnique({ where: { userId }, select: { xp: true, longestStreak: true } }),
      tx.streakLog.aggregate({ where: { userId }, _sum: { minutes: true } }),
    ]);
    return { LESSONS_COMPLETED: lessons, QUIZZES_COMPLETED: quizzes, QUIZ_SCORE_ABOVE: high, ASSIGNMENTS_SUBMITTED: assignments, COURSES_COMPLETED: courses, STREAK_DAYS: Math.max(user.streak, wallet?.longestStreak ?? 0), XP_EARNED: wallet?.xp ?? 0, MINUTES_STUDIED: minutes._sum.minutes ?? 0, SUBJECT_LESSONS: lessons };
  }

  private async invalidate(studentId: string) {
    const parents = await this.prisma.parentStudent.findMany({ where: { studentId }, select: { parentId: true } });
    await this.cache.del(`dash:student:${studentId}`, ...parents.map((p) => `dash:parent:${p.parentId}:${studentId}`), ...parents.map((p) => `dash:parent:${p.parentId}:default`));
  }
}
