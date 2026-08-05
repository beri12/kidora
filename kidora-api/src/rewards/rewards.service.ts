import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';

const BOARD = 'leaderboard:global';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

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

  async syncScore(userId: string, name: string, points: number) { await this.cache.addScore(BOARD, userId + '::' + name, points); }

  async leaderboard(count = 10) {
    let rows = await this.cache.topScores(BOARD, count);
    if (rows.length === 0) {
      const users = await this.prisma.user.findMany({ orderBy: { points: 'desc' }, take: count });
      for (const u of users) await this.syncScore(u.id, u.name, u.points);
      rows = await this.cache.topScores(BOARD, count);
    }
    return rows.map((r, i) => { const [id, name] = r.member.split('::'); return { rank: i + 1, id, name, points: r.score }; });
  }
}
