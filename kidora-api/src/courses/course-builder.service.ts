import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseAccessService } from './course-access.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AuditService } from '../common/services/audit.service';
import { RewardsService } from '../rewards/rewards.service';
import { gradeActivity } from '../common/grading/activity.grader';
import { stripAnswerKey } from '../common/grading/question.grader';
import {
  CreateActivityDto,
  CreateLessonDto,
  CreateSectionDto,
  ReorderDto,
  SubmitActivityDto,
  UpdateActivityDto,
  UpdateLessonDto,
  UpdateSectionDto,
} from './dto/builder.dto';

@Injectable()
export class CourseBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly audit: AuditService,
    private readonly rewards: RewardsService,
  ) {}

  /** The full editable tree a teacher's builder screen renders. */
  async tree(tenant: TenantContext, courseId: string) {
    await this.access.assertCanEdit(tenant, courseId);
    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        subject: true,
        grade: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                activities: { orderBy: { order: 'asc' } },
                quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
              },
            },
            quizzes: { include: { questions: { orderBy: { order: 'asc' } } } },
            assignments: true,
          },
        },
        // Lessons created before sections existed still belong to the course.
        lessons: { where: { sectionId: null }, orderBy: { order: 'asc' }, include: { activities: true } },
        exams: { include: { _count: { select: { questions: true } } } },
      },
    });
  }

  // -------------------------------------------------------------- sections

  async addSection(tenant: TenantContext, courseId: string, dto: CreateSectionDto) {
    await this.access.assertCanEdit(tenant, courseId);
    const order = dto.order ?? (await this.nextOrder('section', { courseId }));
    return this.prisma.section.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description ?? null,
        objectives: dto.objectives ?? [],
        order,
      },
    });
  }

  async updateSection(tenant: TenantContext, id: string, dto: UpdateSectionDto) {
    await this.access.assertCanEditSection(tenant, id);
    return this.prisma.section.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        objectives: dto.objectives,
        order: dto.order,
      },
    });
  }

  async deleteSection(tenant: TenantContext, id: string) {
    const section = await this.access.assertCanEditSection(tenant, id);
    // Lessons survive the section (Lesson.sectionId is SetNull) so deleting a
    // section never destroys learning content or a student's progress on it.
    await this.prisma.section.delete({ where: { id } });
    await this.audit.record({
      actorId: tenant.userId, schoolId: tenant.schoolId, action: 'section.delete',
      entity: 'Section', entityId: id, meta: { courseId: section.courseId },
    });
    return { ok: true };
  }

  async reorderSections(tenant: TenantContext, courseId: string, dto: ReorderDto) {
    await this.access.assertCanEdit(tenant, courseId);
    const owned = await this.prisma.section.findMany({
      where: { courseId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (owned.length !== dto.ids.length) throw new BadRequestException('Unknown section in order list');
    await this.prisma.$transaction(
      dto.ids.map((id, i) => this.prisma.section.update({ where: { id }, data: { order: i } })),
    );
    return { ok: true };
  }

  // --------------------------------------------------------------- lessons

  async addLesson(tenant: TenantContext, sectionId: string, dto: CreateLessonDto) {
    const section = await this.access.assertCanEditSection(tenant, sectionId);
    const order = dto.order ?? (await this.nextOrder('lesson', { sectionId }));
    return this.prisma.lesson.create({
      data: {
        courseId: section.courseId,
        sectionId,
        title: dto.title,
        description: dto.description ?? null,
        content: dto.content ?? null,
        type: dto.type ?? 'VIDEO',
        order,
        estimatedMinutes: dto.estimatedMinutes ?? 5,
        duration: `${dto.estimatedMinutes ?? 5} min`,
        videoUrl: dto.videoUrl ?? null,
        audioUrl: dto.audioUrl ?? null,
        imageUrls: dto.imageUrls ?? [],
        documentUrls: dto.documentUrls ?? [],
        objectives: dto.objectives ?? [],
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async updateLesson(tenant: TenantContext, id: string, dto: UpdateLessonDto) {
    await this.access.assertCanEditLesson(tenant, id);
    return this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        type: dto.type,
        order: dto.order,
        estimatedMinutes: dto.estimatedMinutes,
        duration: dto.estimatedMinutes ? `${dto.estimatedMinutes} min` : undefined,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        objectives: dto.objectives,
        isRequired: dto.isRequired,
      },
    });
  }

  async deleteLesson(tenant: TenantContext, id: string) {
    await this.access.assertCanEditLesson(tenant, id);
    await this.prisma.lesson.delete({ where: { id } });
    await this.audit.record({
      actorId: tenant.userId, schoolId: tenant.schoolId, action: 'lesson.delete',
      entity: 'Lesson', entityId: id,
    });
    return { ok: true };
  }

  async reorderLessons(tenant: TenantContext, sectionId: string, dto: ReorderDto) {
    await this.access.assertCanEditSection(tenant, sectionId);
    const owned = await this.prisma.lesson.findMany({
      where: { sectionId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (owned.length !== dto.ids.length) throw new BadRequestException('Unknown lesson in order list');
    await this.prisma.$transaction(
      dto.ids.map((id, i) => this.prisma.lesson.update({ where: { id }, data: { order: i } })),
    );
    return { ok: true };
  }

  // ------------------------------------------------------------ activities

  async addActivity(tenant: TenantContext, lessonId: string, dto: CreateActivityDto) {
    await this.access.assertCanEditLesson(tenant, lessonId);
    const order = dto.order ?? (await this.nextOrder('activity', { lessonId }));
    return this.prisma.activity.create({
      data: {
        lessonId,
        title: dto.title,
        instructions: dto.instructions ?? null,
        type: dto.type,
        order,
        points: dto.points ?? 10,
        config: (dto.config ?? {}) as any,
        solution: (dto.solution ?? {}) as any,
      },
    });
  }

  async updateActivity(tenant: TenantContext, id: string, dto: UpdateActivityDto) {
    await this.access.assertCanEditActivity(tenant, id);
    return this.prisma.activity.update({
      where: { id },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        type: dto.type,
        order: dto.order,
        points: dto.points,
        config: dto.config as any,
        solution: dto.solution as any,
      },
    });
  }

  async deleteActivity(tenant: TenantContext, id: string) {
    await this.access.assertCanEditActivity(tenant, id);
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true };
  }

  /** Student-facing read: the answer key never leaves the server. */
  async activityForStudent(tenant: TenantContext, id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { lesson: { select: { id: true, title: true, courseId: true } } },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.access.assertCanLearn(tenant, activity.lesson.courseId);

    const { solution, config, ...rest } = activity;
    return { ...rest, config: stripAnswerKey(config) ?? {} };
  }

  /**
   * Grades one activity attempt on the server and pays the reward.
   * The request carries a *response*, never a score.
   */
  async submitActivity(tenant: TenantContext, id: string, dto: SubmitActivityDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { lesson: { select: { courseId: true } } },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.access.assertCanLearn(tenant, activity.lesson.courseId);

    const graded = gradeActivity(
      { id: activity.id, type: activity.type, points: activity.points, solution: activity.solution },
      dto.response,
    );

    const previous = await this.prisma.activityAttempt.count({
      where: { activityId: id, studentId: tenant.userId },
    });
    const alreadyPassed = await this.prisma.activityAttempt.findFirst({
      where: { activityId: id, studentId: tenant.userId, correct: true },
      select: { id: true },
    });

    await this.prisma.activityAttempt.create({
      data: {
        activityId: id,
        studentId: tenant.userId,
        response: (dto.response ?? {}) as any,
        score: graded.score,
        maxScore: graded.maxScore,
        correct: graded.correct,
        attemptNo: previous + 1,
      },
    });

    // Reward the first correct attempt only, so retries cannot farm XP.
    let reward: Awaited<ReturnType<RewardsService['awardXp']>> | null = null;
    if (graded.correct && !alreadyPassed) {
      reward = await this.rewards.awardXp(tenant.userId, 'ACTIVITY_COMPLETED', {
        xp: activity.xpReward,
        coins: activity.coinReward,
        refType: 'activity',
        refId: activity.id,
        description: activity.title,
      });
    }

    return {
      correct: graded.correct,
      score: graded.score,
      maxScore: graded.maxScore,
      attemptNo: previous + 1,
      reward,
    };
  }

  // ---------------------------------------------------------------- helper

  private async nextOrder(
    model: 'section' | 'lesson' | 'activity',
    where: Record<string, string>,
  ): Promise<number> {
    const delegate = this.prisma[model] as any;
    const last = await delegate.findFirst({ where, orderBy: { order: 'desc' }, select: { order: true } });
    return (last?.order ?? -1) + 1;
  }
}
