import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SCHOOL_ADMIN_ROLES } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  CompletionRulesDto, ContentBlockDto, CourseBasicsDto, LessonDto, ReorderDto, SaveContentDto,
  SectionDto, UpdateContentBlockDto, UpdateCourseDto, UpdateLessonDto, UpdateSectionDto,
} from './dto';

/** "" from a cleared form field means "unset", not the empty string. */
function blankToNull(v: string | undefined): string | null | undefined {
  return v === undefined ? undefined : v.trim() || null;
}

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'course';
}

/**
 * Course authoring: the structure a teacher builds before publishing.
 *
 * Authorship is stricter here than `TenancyService.assertTeacherOfCourse`,
 * which also lets any teacher of a class the course is assigned to through.
 * Editing is limited to the course's own author (or a school admin over the
 * course's school), so one teacher cannot rewrite another's course.
 */
@Injectable()
export class AuthoringService {
  constructor(private prisma: PrismaService) {}

  /** Throws unless `u` may edit this course. Returns the course row. */
  async assertAuthor(u: AuthUser, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, schoolId: true, status: true, title: true },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (SCHOOL_ADMIN_ROLES.includes(u.role)) {
      // A school admin may edit courses belonging to their own school only.
      if (u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN' && course.schoolId !== u.schoolId) {
        throw new ForbiddenException('That course belongs to another school.');
      }
      return course;
    }
    if (course.teacherId !== u.id) throw new ForbiddenException('You are not the author of this course.');
    return course;
  }

  /* ---------------------------------------------------------------- course */

  async createCourse(u: AuthUser, dto: CourseBasicsDto) {
    const base = slugify(dto.title);
    let slug = base;
    for (let n = 1; await this.prisma.course.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${base}-${n}`;
    }
    const subjectId = await this.resolveSubject(dto);
    return this.prisma.course.create({
      data: {
        ...this.courseData(dto),
        title: dto.title, // required on create; courseData types it optional for patches
        subjectId,
        slug,
        teacherId: u.id,
        schoolId: u.schoolId,
        status: 'DRAFT',
        published: false,
      },
      include: AuthoringService.courseInclude,
    });
  }

  async updateCourse(u: AuthUser, courseId: string, dto: UpdateCourseDto) {
    await this.assertAuthor(u, courseId);
    const subjectId = await this.resolveSubject(dto);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { ...this.courseData(dto), ...(subjectId ? { subjectId } : {}) },
      include: AuthoringService.courseInclude,
    });
  }

  async setCompletionRules(u: AuthUser, courseId: string, dto: CompletionRulesDto) {
    await this.assertAuthor(u, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        requireAllLessons: dto.requireAllLessons,
        requireAllQuizzes: dto.requireAllQuizzes,
        requireAllAssignments: dto.requireAllAssignments,
        requireFinalExam: dto.requireFinalExam,
        passingScore: dto.passingScore,
        issuesCertificate: dto.issuesCertificate,
      },
      select: {
        id: true, requireAllLessons: true, requireAllQuizzes: true, requireAllAssignments: true,
        requireFinalExam: true, passingScore: true, issuesCertificate: true,
      },
    });
  }

  /** The whole hierarchy, for the wizard and the preview. */
  async courseTree(u: AuthUser, courseId: string) {
    await this.assertAuthor(u, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        subject: { select: { id: true, name: true, slug: true, accent: true } },
        grade: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                contents: { orderBy: { order: 'asc' } },
                quiz: { select: { id: true, title: true, published: true, _count: { select: { questions: true } } } },
                assignments: { select: { id: true, title: true, status: true, dueAt: true } },
                _count: { select: { resources: true } },
              },
            },
          },
        },
        quizzes: {
          where: { kind: 'LESSON', lessonId: null },
          select: { id: true, title: true, sectionId: true, published: true, isRequired: true, _count: { select: { questions: true } } },
        },
        assignments: { select: { id: true, title: true, status: true, dueAt: true, maxScore: true, isRequired: true, lessonId: true } },
        exams: {
          select: {
            id: true, title: true, status: true, scheduledAt: true, durationMin: true, passingScore: true,
            quiz: { select: { id: true, _count: { select: { questions: true } } } },
          },
        },
        _count: { select: { lessons: true, enrollments: true } },
      },
    });
    return course;
  }

  /* --------------------------------------------------------------- section */

  async createSection(u: AuthUser, courseId: string, dto: SectionDto) {
    await this.assertAuthor(u, courseId);
    const last = await this.prisma.section.findFirst({
      where: { courseId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.section.create({
      data: { courseId, title: dto.title, description: dto.description ?? '', order: (last?.order ?? -1) + 1 },
    });
  }

  async updateSection(u: AuthUser, sectionId: string, dto: UpdateSectionDto) {
    const section = await this.sectionOr404(sectionId);
    await this.assertAuthor(u, section.courseId);
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { title: dto.title, description: dto.description },
    });
  }

  async deleteSection(u: AuthUser, sectionId: string) {
    const section = await this.sectionOr404(sectionId);
    await this.assertAuthor(u, section.courseId);
    // Lessons have no cascade from Section (they hang off Course), so a plain
    // delete would orphan them into the course root. Remove them explicitly.
    await this.prisma.$transaction([
      this.prisma.lesson.deleteMany({ where: { sectionId } }),
      this.prisma.section.delete({ where: { id: sectionId } }),
    ]);
    return { ok: true };
  }

  async reorderSections(u: AuthUser, courseId: string, dto: ReorderDto) {
    await this.assertAuthor(u, courseId);
    const owned = await this.prisma.section.findMany({ where: { courseId }, select: { id: true } });
    this.assertSameSet(owned.map((s) => s.id), dto.ids, 'section');
    await this.prisma.$transaction(
      dto.ids.map((id, order) => this.prisma.section.update({ where: { id }, data: { order } })),
    );
    return this.prisma.section.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
  }

  async duplicateSection(u: AuthUser, sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { lessons: { orderBy: { order: 'asc' }, include: { contents: { orderBy: { order: 'asc' } } } } },
    });
    if (!section) throw new NotFoundException('Section not found.');
    await this.assertAuthor(u, section.courseId);

    const last = await this.prisma.section.findFirst({
      where: { courseId: section.courseId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.section.create({
        data: {
          courseId: section.courseId,
          title: `${section.title} (copy)`,
          description: section.description,
          order: (last?.order ?? -1) + 1,
        },
      });
      for (const lesson of section.lessons) {
        const lessonCopy = await tx.lesson.create({
          data: {
            courseId: section.courseId, sectionId: copy.id, title: lesson.title, description: lesson.description,
            type: lesson.type, status: 'DRAFT', order: lesson.order, videoUrl: lesson.videoUrl,
            objectives: lesson.objectives, estimatedMin: lesson.estimatedMin, isRequired: lesson.isRequired,
            duration: lesson.duration, xpReward: lesson.xpReward, coinReward: lesson.coinReward,
          },
        });
        if (lesson.contents.length) {
          await tx.lessonContent.createMany({
            data: lesson.contents.map((c) => ({
              lessonId: lessonCopy.id, type: c.type, order: c.order, title: c.title,
              body: c.body, url: c.url, meta: c.meta as Prisma.InputJsonValue,
            })),
          });
        }
      }
      return tx.section.findUniqueOrThrow({
        where: { id: copy.id },
        include: { lessons: { orderBy: { order: 'asc' } } },
      });
    }, { timeout: 20000 });
  }

  /* ---------------------------------------------------------------- lesson */

  async createLesson(u: AuthUser, sectionId: string, dto: LessonDto) {
    const section = await this.sectionOr404(sectionId);
    await this.assertAuthor(u, section.courseId);
    const last = await this.prisma.lesson.findFirst({
      where: { sectionId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.lesson.create({
      data: {
        courseId: section.courseId,
        sectionId,
        title: dto.title,
        description: dto.description ?? '',
        type: dto.type ?? 'MIXED',
        status: dto.status ?? 'DRAFT',
        objectives: dto.objectives ?? [],
        estimatedMin: dto.estimatedMin ?? 5,
        isRequired: dto.isRequired ?? true,
        videoUrl: dto.videoUrl,
        duration: `${dto.estimatedMin ?? 5} min`,
        order: (last?.order ?? -1) + 1,
      },
    });
  }

  async getLesson(u: AuthUser, lessonId: string) {
    const lesson = await this.lessonOr404(lessonId);
    await this.assertAuthor(u, lesson.courseId);
    return this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: {
        contents: { orderBy: { order: 'asc' } },
        resources: true,
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        assignments: true,
        section: { select: { id: true, title: true } },
      },
    });
  }

  async updateLesson(u: AuthUser, lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.lessonOr404(lessonId);
    await this.assertAuthor(u, lesson.courseId);
    if (dto.sectionId) {
      const target = await this.sectionOr404(dto.sectionId);
      if (target.courseId !== lesson.courseId) {
        throw new BadRequestException('Cannot move a lesson into another course.');
      }
    }
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        objectives: dto.objectives,
        estimatedMin: dto.estimatedMin,
        isRequired: dto.isRequired,
        videoUrl: dto.videoUrl,
        sectionId: dto.sectionId,
        ...(dto.estimatedMin ? { duration: `${dto.estimatedMin} min` } : {}),
      },
    });
  }

  async deleteLesson(u: AuthUser, lessonId: string) {
    const lesson = await this.lessonOr404(lessonId);
    await this.assertAuthor(u, lesson.courseId);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { ok: true };
  }

  async reorderLessons(u: AuthUser, sectionId: string, dto: ReorderDto) {
    const section = await this.sectionOr404(sectionId);
    await this.assertAuthor(u, section.courseId);
    const owned = await this.prisma.lesson.findMany({ where: { sectionId }, select: { id: true } });
    this.assertSameSet(owned.map((l) => l.id), dto.ids, 'lesson');
    await this.prisma.$transaction(
      dto.ids.map((id, order) => this.prisma.lesson.update({ where: { id }, data: { order } })),
    );
    return this.prisma.lesson.findMany({ where: { sectionId }, orderBy: { order: 'asc' } });
  }

  async duplicateLesson(u: AuthUser, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { contents: { orderBy: { order: 'asc' } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    await this.assertAuthor(u, lesson.courseId);
    const last = await this.prisma.lesson.findFirst({
      where: { sectionId: lesson.sectionId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.lesson.create({
        data: {
          courseId: lesson.courseId, sectionId: lesson.sectionId, title: `${lesson.title} (copy)`,
          description: lesson.description, type: lesson.type, status: 'DRAFT', videoUrl: lesson.videoUrl,
          objectives: lesson.objectives, estimatedMin: lesson.estimatedMin, isRequired: lesson.isRequired,
          duration: lesson.duration, xpReward: lesson.xpReward, coinReward: lesson.coinReward,
          order: (last?.order ?? -1) + 1,
        },
      });
      if (lesson.contents.length) {
        await tx.lessonContent.createMany({
          data: lesson.contents.map((c) => ({
            lessonId: copy.id, type: c.type, order: c.order, title: c.title,
            body: c.body, url: c.url, meta: c.meta as Prisma.InputJsonValue,
          })),
        });
      }
      return tx.lesson.findUniqueOrThrow({ where: { id: copy.id }, include: { contents: true } });
    }, { timeout: 20000 });
  }

  /* --------------------------------------------------------------- content */

  async addContent(u: AuthUser, lessonId: string, dto: ContentBlockDto) {
    const lesson = await this.lessonOr404(lessonId);
    await this.assertAuthor(u, lesson.courseId);
    const last = await this.prisma.lessonContent.findFirst({
      where: { lessonId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.lessonContent.create({
      data: {
        lessonId, type: dto.type, title: dto.title ?? '', body: dto.body, url: dto.url,
        meta: (dto.meta ?? {}) as Prisma.InputJsonValue, order: (last?.order ?? -1) + 1,
      },
    });
  }

  async updateContent(u: AuthUser, blockId: string, dto: UpdateContentBlockDto) {
    const block = await this.prisma.lessonContent.findUnique({
      where: { id: blockId }, select: { id: true, lesson: { select: { courseId: true } } },
    });
    if (!block) throw new NotFoundException('Content block not found.');
    await this.assertAuthor(u, block.lesson.courseId);
    return this.prisma.lessonContent.update({
      where: { id: blockId },
      data: {
        type: dto.type, title: dto.title, body: dto.body, url: dto.url,
        ...(dto.meta ? { meta: dto.meta as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async deleteContent(u: AuthUser, blockId: string) {
    const block = await this.prisma.lessonContent.findUnique({
      where: { id: blockId }, select: { id: true, lesson: { select: { courseId: true } } },
    });
    if (!block) throw new NotFoundException('Content block not found.');
    await this.assertAuthor(u, block.lesson.courseId);
    await this.prisma.lessonContent.delete({ where: { id: blockId } });
    return { ok: true };
  }

  /** Replace every block on a lesson — what the block editor's save button posts. */
  async saveContent(u: AuthUser, lessonId: string, dto: SaveContentDto) {
    const lesson = await this.lessonOr404(lessonId);
    await this.assertAuthor(u, lesson.courseId);
    return this.prisma.$transaction(async (tx) => {
      await tx.lessonContent.deleteMany({ where: { lessonId } });
      if (dto.blocks.length) {
        await tx.lessonContent.createMany({
          data: dto.blocks.map((b, order) => ({
            lessonId, type: b.type, order, title: b.title ?? '', body: b.body, url: b.url,
            meta: (b.meta ?? {}) as Prisma.InputJsonValue,
          })),
        });
      }
      return tx.lessonContent.findMany({ where: { lessonId }, orderBy: { order: 'asc' } });
    }, { timeout: 20000 });
  }

  /* --------------------------------------------------------------- helpers */

  private static readonly courseInclude = {
    subject: { select: { id: true, name: true, slug: true, accent: true } },
    grade: { select: { id: true, name: true } },
    _count: { select: { lessons: true, sections: true, enrollments: true } },
  } as const;

  private courseData(dto: UpdateCourseDto) {
    return {
      title: dto.title,
      shortDescription: dto.shortDescription,
      description: dto.description,
      // A "no grade" picker sends "", which is a valid string but not a valid
      // Grade id — it reached the database as a foreign key and failed there.
      // Empty means "clear it".
      gradeId: dto.gradeId === undefined ? undefined : dto.gradeId || null,
      ageBand: blankToNull(dto.ageBand),
      language: blankToNull(dto.language),
      subtitleLanguage: blankToNull(dto.subtitleLanguage),
      difficulty: dto.difficulty,
      learningPoints: dto.learningPoints,
      requirements: dto.requirements,
      tags: dto.tags,
      category: dto.category,
      subCategory: dto.subCategory,
      topic: dto.topic,
      thumbnailUrl: blankToNull(dto.thumbnailUrl),
      bannerUrl: blankToNull(dto.bannerUrl),
      trailerUrl: blankToNull(dto.trailerUrl),
      estimatedMinutes: dto.estimatedMinutes,
      access: dto.access,
      isPremium: dto.access ? dto.access === 'PREMIUM' : undefined,
    };
  }

  /** Accepts either a subject id or the slug the wizard sends. */
  private async resolveSubject(dto: UpdateCourseDto): Promise<string | undefined> {
    if (dto.subjectId) {
      const s = await this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { id: true } });
      if (!s) throw new BadRequestException('Unknown subject.');
      return s.id;
    }
    if (dto.subjectSlug) {
      const s = await this.prisma.subject.findUnique({ where: { slug: dto.subjectSlug }, select: { id: true } });
      if (!s) throw new BadRequestException('Unknown subject.');
      return s.id;
    }
    return undefined;
  }

  private async sectionOr404(id: string) {
    const s = await this.prisma.section.findUnique({ where: { id }, select: { id: true, courseId: true } });
    if (!s) throw new NotFoundException('Section not found.');
    return s;
  }

  private async lessonOr404(id: string) {
    const l = await this.prisma.lesson.findUnique({ where: { id }, select: { id: true, courseId: true, sectionId: true } });
    if (!l) throw new NotFoundException('Lesson not found.');
    return l;
  }

  /**
   * A reorder must list exactly the ids that belong to the parent — no more,
   * no fewer. Without this an attacker could pass another course's lesson id
   * and have its `order` rewritten.
   */
  private assertSameSet(owned: string[], given: string[], label: string) {
    const ownedSet = new Set(owned);
    if (given.length !== ownedSet.size || given.some((id) => !ownedSet.has(id))) {
      throw new BadRequestException(`The ${label} order must list every ${label} in this parent exactly once.`);
    }
  }
}
