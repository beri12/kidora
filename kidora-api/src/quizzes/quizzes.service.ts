import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService, private rewards: RewardsService, private notifications: NotificationsService) {}

  // Serve a quiz WITHOUT the correct answers.
  async get(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id }, include: { questions: true } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return { ...quiz, questions: quiz.questions.map(({ correct, ...q }) => q) };
  }

  // Grade server-side, award points (10/correct), badge on perfect score.
  async submit(quizId: string, userId: string, answers: number[]) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: true } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    let score = 0;
    quiz.questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });
    const total = quiz.questions.length;
    const points = score * 10;
    const user = await this.prisma.user.update({ where: { id: userId }, data: { points: { increment: points } } });
    await this.rewards.syncScore(userId, user.name, user.points);
    if (score === total) {
      await this.rewards.award(userId, 'quiz-champ');
      await this.notifications.create(userId, '⭐ Perfect score!', 'You aced the quiz and earned a badge.');
    }
    return { score, total, pointsEarned: points, perfect: score === total };
  }
}
