import { Injectable, Logger } from '@nestjs/common';
import { XpReason } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { EconomyService } from '../economy/economy.service';

const BOARD = 'leaderboard:global';

/** Default XP/coin values per reason. Callers may override per award. */
export const XP_TABLE: Record<XpReason, { xp: number; coins: number }> = {
  LESSON_COMPLETED: { xp: 20, coins: 5 },
  ACTIVITY_COMPLETED: { xp: 15, coins: 5 },
  QUIZ_COMPLETED: { xp: 30, coins: 10 },
  QUIZ_PERFECT: { xp: 50, coins: 20 },
  ASSIGNMENT_SUBMITTED: { xp: 25, coins: 10 },
  ASSIGNMENT_GRADED: { xp: 20, coins: 10 },
  EXAM_PASSED: { xp: 150, coins: 50 },
  QUEST_COMPLETED: { xp: 100, coins: 30 },
  BOSS_DEFEATED: { xp: 200, coins: 75 },
  COURSE_COMPLETED: { xp: 250, coins: 100 },
  DAILY_STREAK: { xp: 40, coins: 15 },
};

export interface AwardResult {
  xp: number;
  coins: number;
  totalXp: number;
  level: number;
  levelUp: boolean;
  badge?: { slug: string; name: string } | null;
}

/**
 * The single place XP, coins and badges are granted.
 *
 * Every controller path (lessons, activities, quizzes, assignments, exams,
 * quests) calls into here rather than doing its own wallet arithmetic, so
 * reward rules live in one file and a client can never propose an amount:
 * the caller names a *reason*, the table names the value.
 */
@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private economy: EconomyService,
  ) {}

  async badgesFor(userId: string) {
    const all = await this.prisma.badge.findMany();
    const earned = new Set((await this.prisma.userBadge.findMany({ where: { userId } })).map((e) => e.badgeId));
    return all.map((b) => ({ ...b, earned: earned.has(b.id) }));
  }

  // Idempotent award by slug.
  async award(userId: string, slug: string) {
    const badge = await this.prisma.badge.findUnique({ where: { slug } });
    if (!badge) return null;
    const exists = await this.prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
    if (exists) return null;
    return this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  }

  /** Alias with the name the rest of the platform uses. */
  unlockBadge(userId: string, slug: string) {
    return this.award(userId, slug);
  }

  /**
   * Grant XP (and the coins that go with it) for a named reason.
   * Writes an append-only XpEvent row so every point is traceable.
   */
  async awardXp(
    userId: string,
    reason: XpReason,
    opts: { xp?: number; coins?: number; refType?: string; refId?: string; description?: string } = {},
  ): Promise<AwardResult> {
    const base = XP_TABLE[reason] ?? { xp: 0, coins: 0 };
    // Negative or non-finite values are clamped away — an award never removes XP.
    const xp = Math.max(0, Math.round(opts.xp ?? base.xp)) || 0;
    const coins = Math.max(0, Math.round(opts.coins ?? base.coins)) || 0;

    const before = await this.economy.wallet(userId);
    const wallet = await this.economy.earn(userId, coins, xp, opts.description ?? reason);

    await this.prisma.xpEvent.create({
      data: {
        studentId: userId,
        reason,
        amount: xp,
        coins,
        refType: opts.refType ?? null,
        refId: opts.refId ?? null,
      },
    });

    // Keep the legacy User.points field and the Redis leaderboard in step, so
    // existing dashboards and the leaderboard keep working unchanged.
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: xp } },
      select: { id: true, name: true, points: true },
    });
    await this.syncScore(user.id, user.name, user.points);

    return {
      xp,
      coins,
      totalXp: wallet.xp,
      level: wallet.level,
      levelUp: wallet.level > before.level,
    };
  }

  /** Coins only (shop refunds, streak bonuses that carry no XP). */
  async awardCoins(userId: string, coins: number, description = 'Reward') {
    const amount = Math.max(0, Math.round(coins)) || 0;
    return this.economy.earn(userId, amount, 0, description);
  }

  /**
   * Mark a quest complete and pay out its rewards exactly once.
   * Re-running it is a no-op, so a replayed request cannot farm XP.
   */
  async completeQuest(userId: string, questId: string): Promise<AwardResult | null> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return null;

    const existing = await this.prisma.studentQuest.findUnique({
      where: { questId_studentId: { questId, studentId: userId } },
    });
    if (existing?.status === 'COMPLETED') return null;

    await this.prisma.studentQuest.upsert({
      where: { questId_studentId: { questId, studentId: userId } },
      update: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      create: {
        questId,
        studentId: userId,
        status: 'COMPLETED',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const result = await this.awardXp(
      userId,
      quest.isBoss ? XpReason.BOSS_DEFEATED : XpReason.QUEST_COMPLETED,
      { xp: quest.xpReward, coins: quest.coinReward, refType: 'quest', refId: quest.id, description: quest.title },
    );

    if (quest.badgeSlug) {
      const badge = await this.unlockBadge(userId, quest.badgeSlug);
      if (badge) {
        const meta = await this.prisma.badge.findUnique({ where: { slug: quest.badgeSlug } });
        return { ...result, badge: meta ? { slug: meta.slug, name: meta.name } : null };
      }
    }
    return result;
  }

  /** Recent XP ledger for a student — powers the rewards timeline. */
  xpHistory(userId: string, take = 30) {
    return this.prisma.xpEvent.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async syncScore(userId: string, name: string, points: number) {
    try {
      await this.cache.addScore(BOARD, userId + '::' + name, points);
    } catch (err) {
      // The leaderboard is a cache, never a source of truth — a Redis outage
      // must not fail a lesson completion.
      this.logger.warn(`leaderboard sync failed: ${String(err)}`);
    }
  }

  async leaderboard(count = 10) {
    let rows = await this.cache.topScores(BOARD, count);
    if (rows.length === 0) {
      const users = await this.prisma.user.findMany({ orderBy: { points: 'desc' }, take: count });
      for (const u of users) await this.syncScore(u.id, u.name, u.points);
      rows = await this.cache.topScores(BOARD, count);
    }
    // Same response shape as before, but a child's full name is never published
    // on this unauthenticated endpoint (see PHASE 32 in KIDORA_UPDATE_PLAN.md).
    return rows.map((r, i) => {
      const [id, name] = r.member.split('::');
      return { rank: i + 1, id, name: displayName(name), points: r.score };
    });
  }

  /**
   * School- and class-safe leaderboard for the student UI: only classmates,
   * always framed around personal bests, and it never reports a "last place".
   */
  async classLeaderboard(userId: string, count = 10) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, points: true, schoolId: true },
    });
    if (!me) return { me: null, top: [] };

    const peers = me.schoolId
      ? await this.prisma.user.findMany({
          where: { schoolId: me.schoolId, role: 'CHILD' },
          orderBy: { points: 'desc' },
          take: count,
          select: { id: true, name: true, points: true },
        })
      : [];

    const best = await this.prisma.xpEvent.aggregate({
      where: { studentId: userId },
      _max: { amount: true },
    });

    return {
      me: { id: me.id, name: displayName(me.name), points: me.points, personalBest: best._max.amount ?? 0 },
      top: peers.map((p, i) => ({ rank: i + 1, id: p.id, name: displayName(p.name), points: p.points })),
    };
  }
}

/** "Leo Abebe" -> "Leo A." — enough to recognise a classmate, not to identify a child. */
function displayName(full?: string): string {
  if (!full) return 'Explorer';
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}
