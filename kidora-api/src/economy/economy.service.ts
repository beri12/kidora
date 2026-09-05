import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TxnType } from '@prisma/client';

/**
 * XP needed to reach the next level.
 *
 * 0-499 XP   => Level 1
 * 500-999 XP => Level 2
 * 1000-1499  => Level 3
 */
const levelForXp = (xp: number): number => {
  return Math.max(1, Math.floor(xp / 500) + 1);
};

@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the user's reward wallet.
   *
   * Creates the wallet with starter rewards if it doesn't exist.
   */
  async wallet(userId: string) {
    let wallet = await this.prisma.rewardWallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      wallet = await this.prisma.rewardWallet.create({
        data: {
          userId,
          coins: 100,
          gems: 5,
          xp: 0,
          level: 1,
        },
      });
    }

    return wallet;
  }

  /**
   * Central transaction/ledger write.
   *
   * Every coin/gem/XP change should ideally have a corresponding
   * transaction record.
   */
  async record(
    userId: string,
    type: TxnType,
    amount: number,
    description = '',
  ) {
    await this.wallet(userId);

    return this.prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        description,
      },
    });
  }

  /**
   * Give a student coins and/or XP.
   */
  async earn(
    userId: string,
    coins: number,
    xp = 0,
    description = 'Reward',
  ) {
    const wallet = await this.wallet(userId);

    const newCoins = wallet.coins + coins;
    const newXp = wallet.xp + xp;
    const newLevel = levelForXp(newXp);

    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.rewardWallet.update({
        where: {
          userId,
        },
        data: {
          coins: newCoins,
          xp: newXp,
          level: newLevel,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TxnType.EARN,
          amount: coins,
          description,
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Buy an avatar item.
   *
   * Checks:
   * - item exists
   * - student doesn't already own it
   * - student has enough coins
   *
   * Then:
   * - deducts coins
   * - creates transaction
   * - adds item to inventory
   */
  async purchase(userId: string, itemId: string) {
    const item = await this.prisma.avatarItem.findUnique({
      where: {
        id: itemId,
      },
    });

    if (!item) {
      throw new BadRequestException('Item not found');
    }

    const owned = await this.prisma.inventory.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (owned) {
      throw new BadRequestException('Already owned');
    }

    const wallet = await this.wallet(userId);

    if (wallet.coins < item.price) {
      throw new BadRequestException('Not enough coins');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.rewardWallet.update({
        where: {
          userId,
        },
        data: {
          coins: {
            decrement: item.price,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TxnType.PURCHASE,
          amount: -item.price,
          description: `Bought ${item.name}`,
        },
      });

      const inventory = await tx.inventory.create({
        data: {
          userId,
          itemId,
        },
        include: {
          item: true,
        },
      });

      return {
        wallet: updatedWallet,
        inventory,
      };
    });
  }

  /**
   * Get the latest 50 transactions for a student.
   */
  async transactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  /**
   * Generate the period key for a mission.
   *
   * One-off:
   * ""
   *
   * Daily:
   * "2026-09-03"
   *
   * Weekly:
   * "2026-W36"
   */
  private getMissionPeriodKey(
    frequency?: string | null,
    date = new Date(),
  ): string {
    if (!frequency) {
      return '';
    }

    const normalized = frequency.toUpperCase();

    if (normalized === 'DAILY') {
      return date.toISOString().slice(0, 10);
    }

    if (normalized === 'WEEKLY') {
      return this.getWeekKey(date);
    }

    return '';
  }

  /**
   * ISO week key.
   *
   * Example:
   * 2026-W36
   */
  private getWeekKey(date: Date): string {
    const target = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    const dayNumber = target.getUTCDay() || 7;

    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(
      Date.UTC(target.getUTCFullYear(), 0, 1),
    );

    const weekNumber = Math.ceil(
      ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );

    return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(
      2,
      '0',
    )}`;
  }

  /**
   * Get missions for a student.
   *
   * For daily/weekly missions, only the current period is considered.
   * One-off missions use periodKey = "".
   */
  async missions(userId: string) {
    const all = await this.prisma.mission.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    const now = new Date();

    const periodKeys = new Set(
      all.map((mission) =>
        this.getMissionPeriodKey(
          (mission as { frequency?: string | null }).frequency,
          now,
        ),
      ),
    );

    const mine = await this.prisma.studentMission.findMany({
      where: {
        studentId: userId,
        periodKey: {
          in: Array.from(periodKeys),
        },
      },
    });

    const map = new Map(
      mine.map((mission) => [
        `${mission.missionId}:${mission.periodKey}`,
        mission,
      ]),
    );

    return all.map((mission) => {
      const frequency = (
        mission as { frequency?: string | null }
      ).frequency;

      const periodKey = this.getMissionPeriodKey(frequency, now);

      const studentMission = map.get(
        `${mission.id}:${periodKey}`,
      );

      return {
        ...mission,
        periodKey,
        progress: studentMission?.progress ?? 0,
        completed: studentMission?.completed ?? false,
        completedAt: studentMission?.completedAt ?? null,
        claimedAt: studentMission?.claimedAt ?? null,
      };
    });
  }

  /**
   * Complete a mission.
   *
   * IMPORTANT:
   * StudentMission has this compound unique key:
   *
   * @@unique([studentId, missionId, periodKey])
   *
   * Therefore the Prisma selector MUST be:
   *
   * studentId_missionId_periodKey
   */
  async completeMission(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: {
        id: missionId,
      },
    });

    if (!mission) {
      throw new BadRequestException('Mission not found');
    }

    const frequency = (
      mission as { frequency?: string | null }
    ).frequency;

    const periodKey = this.getMissionPeriodKey(
      frequency,
      new Date(),
    );

    const existing = await this.prisma.studentMission.findUnique({
      where: {
        studentId_missionId_periodKey: {
          studentId: userId,
          missionId,
          periodKey,
        },
      },
    });

    /**
     * Already completed/claimed for this period.
     */
    if (existing?.completed) {
      return {
        mission: existing,
        wallet: await this.wallet(userId),
        alreadyCompleted: true,
      };
    }

    /**
     * Mark the mission as completed.
     */
    const completed = await this.prisma.studentMission.upsert({
      where: {
        studentId_missionId_periodKey: {
          studentId: userId,
          missionId,
          periodKey,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
        progress: 100,
      },
      create: {
        studentId: userId,
        missionId,
        periodKey,
        completed: true,
        completedAt: new Date(),
        progress: 100,
      },
    });

    /**
     * Give the reward.
     */
    const wallet = await this.earn(
      userId,
      mission.rewardCoins,
      mission.rewardXP,
      `Mission: ${mission.title}`,
    );

    return {
      mission: completed,
      wallet,
      alreadyCompleted: false,
    };
  }

  /**
   * Get all achievements and the student's progress.
   */
  async achievements(userId: string) {
    const [all, mine] = await Promise.all([
      this.prisma.achievement.findMany({
        orderBy: {
          id: 'asc',
        },
      }),
      this.prisma.userAchievement.findMany({
        where: {
          userId,
        },
      }),
    ]);

    const map = new Map(
      mine.map((achievement) => [
        achievement.achievementId,
        achievement,
      ]),
    );

    return all.map((achievement) => {
      const userAchievement = map.get(achievement.id);

      return {
        ...achievement,
        progress: userAchievement?.progress ?? 0,
        unlockedAt: userAchievement?.unlockedAt ?? null,
      };
    });
  }
}