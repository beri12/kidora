import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseAccessService } from '../courses/course-access.service';
import { RewardsService } from '../rewards/rewards.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { WORLDS, WORLD_BY_SLUG, worldForSubject } from './worlds';

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly rewards: RewardsService,
  ) {}

  /**
   * The world map. Every world reports real progress computed from the
   * learner's courses, so the game surface and the gradebook never disagree.
   */
  async worlds(tenant: TenantContext) {
    const courses = await this.prisma.course.findMany({
      where: this.access.learnerFilter(tenant),
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        subject: { select: { slug: true, name: true } },
        _count: { select: { lessons: true } },
      },
      take: 300,
    });

    const progress = await this.prisma.courseProgress.findMany({
      where: { studentId: tenant.userId },
      select: { courseId: true, percent: true, completed: true },
    });
    const byCourse = new Map(progress.map((p) => [p.courseId, p]));

    const buckets = new Map<string, typeof courses>();
    for (const c of courses) {
      const world = worldForSubject(c.subject?.slug);
      const list = buckets.get(world.slug) ?? [];
      list.push(c);
      buckets.set(world.slug, list);
    }

    let previousComplete = true;
    return WORLDS.map((world) => {
      const inWorld = buckets.get(world.slug) ?? [];
      const percents = inWorld.map((c) => byCourse.get(c.id)?.percent ?? 0);
      const percent = percents.length
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : 0;
      const completed = inWorld.filter((c) => byCourse.get(c.id)?.completed).length;

      // A world unlocks once the previous one is under way, so the map always
      // has a clear next step instead of an intimidating wall of content.
      const locked = !previousComplete && percent === 0;
      previousComplete = percent > 0 || inWorld.length === 0;

      return {
        slug: world.slug,
        name: world.name,
        emoji: world.emoji,
        gradient: world.gradient,
        accent: world.accent,
        npc: world.npc,
        zones: world.zones,
        courseCount: inWorld.length,
        completedCourses: completed,
        percent,
        locked,
      };
    });
  }

  /** One world, with the courses it contains and the learner's place in them. */
  async world(tenant: TenantContext, slug: string) {
    const def = WORLD_BY_SLUG.get(slug);
    if (!def) throw new NotFoundException('World not found');

    const courses = await this.prisma.course.findMany({
      where: {
        AND: [
          this.access.learnerFilter(tenant),
          { OR: [{ subject: { slug: { in: def.subjects } } }, ...(def === WORLDS[0] ? [{ subjectId: null }] : [])] },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        gradient: true,
        accent: true,
        subject: { select: { slug: true, name: true } },
        grade: { select: { id: true, name: true } },
        _count: { select: { lessons: true, sections: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const progress = await this.prisma.courseProgress.findMany({
      where: { studentId: tenant.userId, courseId: { in: courses.map((c) => c.id) } },
      select: { courseId: true, percent: true, completed: true },
    });
    const byCourse = new Map(progress.map((p) => [p.courseId, p]));

    const quests = await this.prisma.quest.findMany({
      where: { world: def.key, published: true },
      orderBy: { order: 'asc' },
      include: {
        students: { where: { studentId: tenant.userId }, select: { status: true, progress: true } },
      },
    });

    return {
      ...def,
      courses: courses.map((c) => ({
        ...c,
        percent: byCourse.get(c.id)?.percent ?? 0,
        completed: byCourse.get(c.id)?.completed ?? false,
      })),
      quests: quests.map((q) => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        story: q.story,
        npcName: q.npcName ?? def.npc.name,
        npcEmoji: q.npcEmoji,
        zone: q.zone,
        isBoss: q.isBoss,
        courseId: q.courseId,
        xpReward: q.xpReward,
        coinReward: q.coinReward,
        status: q.students[0]?.status ?? 'AVAILABLE',
        progress: q.students[0]?.progress ?? 0,
      })),
    };
  }

  /** The learner's quest log. */
  async mine(tenant: TenantContext) {
    const rows = await this.prisma.studentQuest.findMany({
      where: { studentId: tenant.userId },
      orderBy: { updatedAt: 'desc' },
      include: { quest: { include: { course: { select: { id: true, title: true } } } } },
    });
    return rows.map((r) => ({
      id: r.quest.id,
      title: r.quest.title,
      story: r.quest.story,
      npcEmoji: r.quest.npcEmoji,
      isBoss: r.quest.isBoss,
      course: r.quest.course,
      status: r.status,
      progress: r.progress,
      xpReward: r.quest.xpReward,
      coinReward: r.quest.coinReward,
    }));
  }

  /**
   * Today's quest: the first unfinished quest attached to a course the learner
   * can already open, so the headline call to action is always actionable.
   */
  async today(tenant: TenantContext) {
    const openCourses = await this.prisma.course.findMany({
      where: this.access.learnerFilter(tenant),
      select: { id: true },
      take: 300,
    });
    const ids = openCourses.map((c) => c.id);

    const quest = await this.prisma.quest.findFirst({
      where: {
        published: true,
        OR: [{ courseId: { in: ids } }, { courseId: null }],
        students: { none: { studentId: tenant.userId, status: 'COMPLETED' } },
      },
      orderBy: [{ isBoss: 'asc' }, { order: 'asc' }],
      include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
    });
    if (!quest) return null;

    const state = await this.prisma.studentQuest.findUnique({
      where: { questId_studentId: { questId: quest.id, studentId: tenant.userId } },
    });
    return {
      id: quest.id,
      title: quest.title,
      story: quest.story,
      npcName: quest.npcName,
      npcEmoji: quest.npcEmoji,
      isBoss: quest.isBoss,
      course: quest.course,
      xpReward: quest.xpReward,
      coinReward: quest.coinReward,
      status: state?.status ?? 'AVAILABLE',
      progress: state?.progress ?? 0,
    };
  }

  async start(tenant: TenantContext, questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.published) throw new NotFoundException('Quest not found');
    if (quest.courseId) await this.access.assertCanLearn(tenant, quest.courseId);

    return this.prisma.studentQuest.upsert({
      where: { questId_studentId: { questId, studentId: tenant.userId } },
      update: { status: 'IN_PROGRESS' },
      create: { questId, studentId: tenant.userId, status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  /**
   * Completing a quest pays out through the central reward service, which is
   * idempotent — replaying this request earns nothing the second time.
   */
  async complete(tenant: TenantContext, questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.published) throw new NotFoundException('Quest not found');
    if (quest.courseId) await this.access.assertCanLearn(tenant, quest.courseId);

    const reward = await this.rewards.completeQuest(tenant.userId, questId);
    return { questId, reward, alreadyCompleted: reward === null };
  }
}
