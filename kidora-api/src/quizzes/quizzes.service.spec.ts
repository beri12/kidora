import { ForbiddenException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { QuizzesService } from './quizzes.service';

const question = (over: any = {}) => ({
  id: over.id ?? 'q',
  type: QuestionType.MULTIPLE_CHOICE,
  points: 1,
  options: ['a', 'b', 'c'],
  correct: 0,
  data: null,
  ...over,
});

function makeService(over: { quiz?: any; attempts?: number } = {}) {
  const quiz = over.quiz ?? {
    id: 'q1',
    title: 'Quiz',
    passingScore: 60,
    maxAttempts: 0,
    shuffleQuestions: false,
    xpReward: 30,
    coinReward: 10,
    courseId: null,
    lessonId: null,
    questions: [
      question({ id: 'a', correct: 1 }),
      question({ id: 'b', correct: 2 }),
      question({ id: 'c', correct: 0 }),
    ],
  };

  const prisma: any = {
    quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
    quizAttempt: {
      count: jest.fn().mockResolvedValue(over.attempts ?? 0),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    lesson: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const rewards: any = {
    awardXp: jest.fn().mockResolvedValue({ xp: 0, coins: 0, totalXp: 0, level: 1, levelUp: false }),
    award: jest.fn(),
    syncScore: jest.fn(),
  };
  const notifications: any = { create: jest.fn() };
  return { service: new QuizzesService(prisma, rewards, notifications), prisma, rewards, notifications, quiz };
}

describe('QuizzesService.submit', () => {
  it('grades correct answers and awards points (original contract)', async () => {
    const { service, rewards } = makeService();
    const res = await service.submit('q1', 'u1', [1, 2, 0]);

    expect(res).toMatchObject({ score: 3, total: 3, pointsEarned: 30, perfect: true });
    expect(rewards.award).toHaveBeenCalledWith('u1', 'quiz-champ');
  });

  it('handles partial scores without a perfect badge', async () => {
    const { service, rewards } = makeService();
    const res = await service.submit('q1', 'u1', [1, 0, 0]);

    expect(res.score).toBe(2);
    expect(res.perfect).toBe(false);
    expect(rewards.award).not.toHaveBeenCalled();
  });

  it('reports percent and pass/fail against the quiz passing score', async () => {
    const { service } = makeService();
    const res = await service.submit('q1', 'u1', [1, 0, 0]);

    expect(res.percent).toBe(67);
    expect(res.passed).toBe(true);
    expect(res.passingScore).toBe(60);
  });

  it('fails a submission below the passing score', async () => {
    const { service } = makeService();
    const res = await service.submit('q1', 'u1', [0, 0, 1]);

    expect(res.score).toBe(0);
    expect(res.passed).toBe(false);
  });

  it('records the attempt server-side and numbers it', async () => {
    const { service, prisma } = makeService({ attempts: 2 });
    const res = await service.submit('q1', 'u1', [1, 2, 0]);

    expect(res.attemptNo).toBe(3);
    expect(prisma.quizAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quizId: 'q1', studentId: 'u1', attemptNo: 3, passed: true }),
      }),
    );
  });

  it('refuses a submission once the attempt cap is reached', async () => {
    const { service } = makeService({
      attempts: 3,
      quiz: {
        id: 'q1', title: 'Q', passingScore: 60, maxAttempts: 3, shuffleQuestions: false,
        xpReward: 30, coinReward: 10, courseId: null, lessonId: null,
        questions: [question({ id: 'a', correct: 0 })],
      },
    });
    await expect(service.submit('q1', 'u1', [0])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ignores a client-supplied score and grades from the responses', async () => {
    const { service } = makeService();
    // A crafted payload carrying its own score/xp: only the answers are read.
    const res = await service.submit('q1', 'u1', { a: 1, score: 100, xp: 9999 } as any);

    expect(res.score).toBe(1);
    expect(res.percent).toBe(33);
    expect(res.passed).toBe(false);
  });

  it('accepts responses keyed by question id', async () => {
    const { service } = makeService();
    const res = await service.submit('q1', 'u1', { a: 1, b: 2, c: 0 });

    expect(res.perfect).toBe(true);
  });
});

describe('QuizzesService.get', () => {
  it('never returns the answer key', async () => {
    const { service } = makeService();
    const quiz: any = await service.get('q1');

    expect(quiz.questions.every((q: any) => !('correct' in q))).toBe(true);
    expect(quiz.questions.every((q: any) => !('correctText' in q))).toBe(true);
  });
});
