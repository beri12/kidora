import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CertificatesService } from '../certificates/certificates.service';
import { StudentsService } from '../students/students.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { UpdateProgressDto } from './dto/progress.dto';

const LESSON_POINTS = 20;

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private rewards: RewardsService,
    private notifications: NotificationsService,
    private certificates: CertificatesService,
    private students: StudentsService,
    private analytics: AnalyticsService,
  ) {}

  // Record progress; on completion award XP through the central reward service,
  // refresh the course rollup, and check certificate eligibility.
  async update(userId: string, dto: UpdateProgressDto) {
    const percent = dto.completed ? 100 : dto.percent ?? 0;
    const completed = dto.completed ?? percent >= 100;
    const wasCompleted = await this.prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      select: { completed: true },
    });

    const progress = await this.prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      update: { percent, completed },
      create: { userId, lessonId: dto.lessonId, percent, completed },
    });

    // Only the first completion pays out, so re-marking a lesson earns nothing.
    const firstCompletion = completed && !wasCompleted?.completed;

    if (firstCompletion) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        select: { id: true, title: true, courseId: true, xpReward: true, coinReward: true },
      });

      await this.rewards.awardXp(userId, 'LESSON_COMPLETED', {
        xp: lesson?.xpReward ?? LESSON_POINTS,
        coins: lesson?.coinReward ?? 5,
        refType: 'lesson',
        refId: dto.lessonId,
        description: lesson?.title ?? 'Lesson complete',
      });

      const doneCount = await this.prisma.progress.count({ where: { userId, completed: true } });
      if (doneCount === 1) {
        await this.rewards.award(userId, 'first-steps');
        await this.notifications.create(userId, '🏅 Badge unlocked', 'You earned "First Steps"!');
      }
      await this.notifications.create(
        userId,
        '✅ Lesson complete',
        'Nice work! +' + (lesson?.xpReward ?? LESSON_POINTS) + ' XP.',
      );

      if (lesson) {
        await this.students.recomputeCourseProgress(userId, lesson.courseId);
        await this.analytics.track('lesson_completed', {
          userId,
          courseId: lesson.courseId,
          props: { lessonId: lesson.id },
        });
        await this.maybeIssueCertificate(userId, lesson.courseId);
      }
    }
    return progress;
  }

  /**
   * Certificate issuance runs through CertificatesService.maybeIssueForCourse,
   * which enforces the full rule set (required lessons, quizzes and final exam)
   * rather than the old "all lessons touched" shortcut.
   */
  private async maybeIssueCertificate(userId: string, courseId: string) {
    const cert = await this.certificates.maybeIssueForCourse(userId, courseId);
    if (cert) {
      await this.rewards.awardXp(userId, 'COURSE_COMPLETED', {
        refType: 'course',
        refId: courseId,
        description: cert.courseName,
      });
      await this.analytics.track('course_completed', { userId, courseId });
    }
    return cert;
  }

  async forUser(userId: string) {
    const [progress, badges] = await Promise.all([
      this.prisma.progress.findMany({ where: { userId }, include: { lesson: { include: { course: true } } } }),
      this.prisma.userBadge.count({ where: { userId } }),
    ]);
    return { completedLessons: progress.filter((p) => p.completed).length, badges, progress };
  }
}
