import { XpReason } from '@prisma/client';
import { RewardsService, XP_TABLE } from './rewards.service';

function makeService(over: any = {}) {
  const prisma: any = {
    xpEvent: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn(), aggregate: jest.fn() },
    user: { update: jest.fn().mockResolvedValue({ id: 'u1', name: 'Hanna Alemu', points: 100 }) },
    badge: { findUnique: jest.fn().mockResolvedValue(over.badge ?? null) },
    userBadge: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    quest: { findUnique: jest.fn().mockResolvedValue(over.quest ?? null) },
    studentQuest: {
      findUnique: jest.fn().mockResolvedValue(over.studentQuest ?? null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  const cache: any = { addScore: jest.fn(), topScores: jest.fn().mockResolvedValue([]) };
  const economy: any = {
    wallet: jest.fn().mockResolvedValue({ xp: 0, level: 1, coins: 0 }),
    earn: jest.fn().mockResolvedValue({ xp: 20, level: 1, coins: 5 }),
  };
  return { service: new RewardsService(prisma, cache, economy), prisma, cache, economy };
}

describe('RewardsService.awardXp', () => {
  it('takes the amount from the reason table, not from the caller', async () => {
    const { service, economy } = makeService();
    await service.awardXp('u1', XpReason.LESSON_COMPLETED);
    expect(economy.earn).toHaveBeenCalledWith(
      'u1', XP_TABLE.LESSON_COMPLETED.coins, XP_TABLE.LESSON_COMPLETED.xp, expect.any(String),
    );
  });

  it('clamps a negative award to zero so XP can never be drained', async () => {
    const { service, economy } = makeService();
    await service.awardXp('u1', XpReason.QUIZ_COMPLETED, { xp: -500, coins: -100 });
    expect(economy.earn).toHaveBeenCalledWith('u1', 0, 0, expect.any(String));
  });

  it('writes an auditable XpEvent for every award', async () => {
    const { service, prisma } = makeService();
    await service.awardXp('u1', XpReason.EXAM_PASSED, { refType: 'exam', refId: 'ex1' });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ studentId: 'u1', reason: 'EXAM_PASSED', refType: 'exam', refId: 'ex1' }),
    });
  });

  it('keeps the legacy User.points field and the leaderboard in step', async () => {
    const { service, prisma, cache } = makeService();
    await service.awardXp('u1', XpReason.LESSON_COMPLETED);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: XP_TABLE.LESSON_COMPLETED.xp } } }),
    );
    expect(cache.addScore).toHaveBeenCalled();
  });

  it('reports a level-up when the wallet level rises', async () => {
    const { service, economy } = makeService();
    economy.wallet.mockResolvedValue({ xp: 480, level: 1, coins: 0 });
    economy.earn.mockResolvedValue({ xp: 520, level: 2, coins: 5 });
    const res = await service.awardXp('u1', XpReason.QUIZ_COMPLETED);
    expect(res.levelUp).toBe(true);
  });

  it('survives a leaderboard outage without failing the award', async () => {
    const { service, cache } = makeService();
    cache.addScore.mockRejectedValue(new Error('redis down'));
    await expect(service.awardXp('u1', XpReason.LESSON_COMPLETED)).resolves.toBeDefined();
  });
});

describe('RewardsService.completeQuest', () => {
  const quest = {
    id: 'quest1', title: 'The Fraction Village', xpReward: 120, coinReward: 40,
    isBoss: false, badgeSlug: null,
  };

  it('pays out once', async () => {
    const { service, economy } = makeService({ quest });
    const res = await service.completeQuest('u1', 'quest1');
    expect(res).not.toBeNull();
    expect(economy.earn).toHaveBeenCalledWith('u1', 40, 120, 'The Fraction Village');
  });

  it('is a no-op when the quest is already complete, so it cannot be farmed', async () => {
    const { service, economy } = makeService({ quest, studentQuest: { status: 'COMPLETED' } });
    expect(await service.completeQuest('u1', 'quest1')).toBeNull();
    expect(economy.earn).not.toHaveBeenCalled();
  });

  it('uses the boss reason for a boss quest', async () => {
    const { service, prisma } = makeService({ quest: { ...quest, isBoss: true } });
    await service.completeQuest('u1', 'quest1');
    expect(prisma.xpEvent.create).toHaveBeenCalledWith(
      { data: expect.objectContaining({ reason: 'BOSS_DEFEATED' }) },
    );
  });

  it('returns null for an unknown quest', async () => {
    const { service } = makeService();
    expect(await service.completeQuest('u1', 'nope')).toBeNull();
  });
});

describe('leaderboard privacy', () => {
  it('publishes only a first name and last initial for the global board', async () => {
    const { service, cache } = makeService();
    cache.topScores.mockResolvedValue([{ member: 'u1::Hanna Alemu', score: 900 }]);
    const rows = await service.leaderboard(10);
    expect(rows[0].name).toBe('Hanna A.');
  });

  it('leaves a single-word name alone', async () => {
    const { service, cache } = makeService();
    cache.topScores.mockResolvedValue([{ member: 'u1::Leo', score: 10 }]);
    expect((await service.leaderboard(10))[0].name).toBe('Leo');
  });
});
