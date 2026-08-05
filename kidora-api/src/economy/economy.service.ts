import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TxnType } from '@prisma/client';

// XP needed to reach the next level (simple curve).
const levelForXp = (xp: number) => Math.max(1, Math.floor(xp / 500) + 1);

@Injectable()
export class EconomyService {
  constructor(private prisma: PrismaService) {}

  async wallet(userId: string) {
    let w = await this.prisma.rewardWallet.findUnique({ where: { userId } });
    if (!w) w = await this.prisma.rewardWallet.create({ data: { userId, coins: 100, gems: 5, xp: 0, level: 1 } });
    return w;
  }

  // Central ledger write — every coin/gem/xp change goes through here.
  async record(userId: string, type: TxnType, amount: number, description = '') {
    const w = await this.wallet(userId);
    await this.prisma.transaction.create({ data: { userId, type, amount, description } });
    return w;
  }

  async earn(userId: string, coins: number, xp = 0, description = 'Reward') {
    const w = await this.wallet(userId);
    const newXp = w.xp + xp;
    const updated = await this.prisma.rewardWallet.update({ where: { userId }, data: { coins: w.coins + coins, xp: newXp, level: levelForXp(newXp) } });
    await this.prisma.transaction.create({ data: { userId, type: TxnType.EARN, amount: coins, description } });
    return updated;
  }

  // Buy an avatar item: check funds, debit coins, add to inventory.
  async purchase(userId: string, itemId: string) {
    const item = await this.prisma.avatarItem.findUnique({ where: { id: itemId } });
    if (!item) throw new BadRequestException('Item not found');
    const owned = await this.prisma.inventory.findUnique({ where: { userId_itemId: { userId, itemId } } });
    if (owned) throw new BadRequestException('Already owned');
    const w = await this.wallet(userId);
    if (w.coins < item.price) throw new BadRequestException('Not enough coins');
    await this.prisma.rewardWallet.update({ where: { userId }, data: { coins: w.coins - item.price } });
    await this.prisma.transaction.create({ data: { userId, type: TxnType.PURCHASE, amount: -item.price, description: 'Bought ' + item.name } });
    return this.prisma.inventory.create({ data: { userId, itemId }, include: { item: true } });
  }

  transactions(userId: string) {
    return this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  // Daily/weekly missions for a student, with completion state.
  async missions(userId: string) {
    const all = await this.prisma.mission.findMany();
    const mine = await this.prisma.studentMission.findMany({ where: { studentId: userId } });
    const map = new Map(mine.map((m) => [m.missionId, m]));
    return all.map((m) => ({ ...m, completed: map.get(m.id)?.completed ?? false }));
  }

  async completeMission(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new BadRequestException('Mission not found');
    const existing = await this.prisma.studentMission.findUnique({ where: { studentId_missionId: { studentId: userId, missionId } } });
    if (existing?.completed) return existing;
    await this.prisma.studentMission.upsert({
      where: { studentId_missionId: { studentId: userId, missionId } },
      update: { completed: true, completedAt: new Date() },
      create: { studentId: userId, missionId, completed: true, completedAt: new Date() },
    });
    return this.earn(userId, mission.rewardCoins, mission.rewardXP, 'Mission: ' + mission.title);
  }

  // Achievements with progress + unlocked state.
  async achievements(userId: string) {
    const all = await this.prisma.achievement.findMany();
    const mine = await this.prisma.userAchievement.findMany({ where: { userId } });
    const map = new Map(mine.map((a) => [a.achievementId, a]));
    return all.map((a) => ({ ...a, progress: map.get(a.id)?.progress ?? 0, unlockedAt: map.get(a.id)?.unlockedAt ?? null }));
  }
}
