import { QuizzesService } from './quizzes.service';

describe('QuizzesService.submit', () => {
  const quiz = { id: 'q1', questions: [
    { correct: 1 }, { correct: 2 }, { correct: 0 },
  ] };
  const prisma: any = {
    quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
    user: { update: jest.fn().mockResolvedValue({ id: 'u1', name: 'Kid', points: 30 }) },
  };
  const rewards: any = { syncScore: jest.fn(), award: jest.fn() };
  const notifications: any = { create: jest.fn() };
  const service = new QuizzesService(prisma, rewards, notifications);

  it('grades correct answers and awards points', async () => {
    const res = await service.submit('q1', 'u1', [1, 2, 0]);
    expect(res).toEqual({ score: 3, total: 3, pointsEarned: 30, perfect: true });
    expect(rewards.award).toHaveBeenCalledWith('u1', 'quiz-champ');
  });

  it('handles partial scores without a perfect badge', async () => {
    rewards.award.mockClear();
    const res = await service.submit('q1', 'u1', [1, 0, 0]);
    expect(res.score).toBe(2);
    expect(res.perfect).toBe(false);
    expect(rewards.award).not.toHaveBeenCalled();
  });
});
