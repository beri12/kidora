import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CertificatesService } from '../certificates/certificates.service';
import { UpdateProgressDto } from './dto/progress.dto';

const LESSON_POINTS = 20;

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private rewards: RewardsService,
    private notifications: NotificationsService,
    private certificates: CertificatesService,
  ) {}

  // Record progress; on completion award points, first-lesson badge,
  // sync leaderboard, and issue a certificate when the whole course is done.
  async update(userId: string, dto: UpdateProgressDto) {
    const percent = dto.completed ? 100 : dto.percent ?? 0;
    const completed = dto.completed ?? percent >= 100;
    const progress = await this.prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      update: { percent, completed },
      create: { userId, lessonId: dto.lessonId, percent, completed },
    });

    if (completed) {
      const user = await this.prisma.user.update({ where: { id: userId }, data: { points: { increment: LESSON_POINTS } } });
      await this.rewards.syncScore(userId, user.name, user.points);

      const doneCount = await this.prisma.progress.count({ where: { userId, completed: true } });
      if (doneCount === 1) {
        await this.rewards.award(userId, 'first-steps');
        await this.notifications.create(userId, '🏅 Badge unlocked', 'You earned "First Steps"!');
      }
      await this.notifications.create(userId, '✅ Lesson complete', 'Nice work! +' + LESSON_POINTS + ' points.');
      await this.maybeIssueCertificate(userId, dto.lessonId);
    }
    return progress;
  }

  // If every lesson in the course is complete, issue a certificate once.
  private async maybeIssueCertificate(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: { include: { lessons: true } } } });
    if (!lesson) return;
    const lessonIds = lesson.course.lessons.map((l) => l.id);
    const done = await this.prisma.progress.count({ where: { userId, completed: true, lessonId: { in: lessonIds } } });
    if (done >= lessonIds.length) await this.certificates.issue(userId, lesson.course.title);
  }

  async forUser(userId: string) {
    const [progress, badges] = await Promise.all([
      this.prisma.progress.findMany({ where: { userId }, include: { lesson: { include: { course: true } } } }),
      this.prisma.userBadge.count({ where: { userId } }),
    ]);
    return { completedLessons: progress.filter((p) => p.completed).length, badges, progress };
  }
}
