import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CourseAccessService } from './course-access.service';
import { TenantService } from '../common/tenancy/tenant.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AuditService } from '../common/services/audit.service';
import {
  CreateDraftCourseDto,
  UpdateDraftCourseDto,
  SaveCurriculumDto,
  PublishCourseDto,
} from './dto/Course-wizard.dto';
import { CatalogQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/builder.dto';

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'course'
  );
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
  ) {}

  /** Unique slug for a title, retrying with a numeric suffix on collision. */
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let slug = base;
    let suffix = 1;
    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  async createDraft(teacherId: string, dto: CreateDraftCourseDto) {
    const slug = await this.uniqueSlug(dto.title);
    // The owning school is read from the author's own record, never from the
    // request, so a teacher cannot author into someone else's school.
    const author = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { schoolId: true, gradeId: true },
    });

    return this.prisma.course.create({
      data: {
        schoolId: author?.schoolId ?? null,
        title: dto.title,
        description: dto.description,
        category: dto.categoryId,
        subCategory: dto.subCategoryId,
        topic: dto.topic,
        language: dto.language,
        subtitleLanguage: dto.subtitleLanguage,
        levelId: dto.levelId,
        duration: dto.duration,
        slug,
        teacherId,
        status: 'DRAFT',
        published: false,
      },
    });
  }

  async updateDraft(teacherId: string, courseId: string, dto: UpdateDraftCourseDto) {
    await this.assertOwnedDraft(teacherId, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.categoryId,
        subCategory: dto.subCategoryId,
        topic: dto.topic,
        language: dto.language,
        subtitleLanguage: dto.subtitleLanguage,
        levelId: dto.levelId,
        duration: dto.duration,
      },
    });
  }

  async saveCurriculum(teacherId: string, courseId: string, dto: SaveCurriculumDto) {
    await this.assertOwnedDraft(teacherId, courseId);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.section.deleteMany({ where: { courseId } });

        for (const section of dto.sections) {
          const createdSection = await tx.section.create({
            data: { title: section.title, order: section.order, courseId },
          });

          if (section.lectures.length) {
            await tx.lecture.createMany({
              data: section.lectures.map((lecture) => ({
                title: lecture.title,
                order: lecture.order,
                videoUrl: lecture.videoUrl,
                videoFileName: lecture.videoFileName,
                quiz: lecture.quiz ? (lecture.quiz as any) : undefined,
                sectionId: createdSection.id,
              })),
            });
          }
        }

        return tx.course.findUnique({
          where: { id: courseId },
          include: { sections: { include: { lectures: true }, orderBy: { order: 'asc' } } },
        });
      },
      { timeout: 15000 }, // raised from Prisma's 5000ms default; multiple section/lecture inserts can exceed it
    );
  }

  async publish(teacherId: string, courseId: string, dto: PublishCourseDto) {
    await this.assertOwnedDraft(teacherId, courseId);
    await this.assertPublishableBy(teacherId, courseId);

    // Builder-style publish: the curriculum is already persisted, so only flip
    // the flag. Rewriting sections here would delete the builder's lessons.
    if (!dto?.basicInfo) {
      const lessons = await this.prisma.lesson.count({ where: { courseId } });
      if (lessons === 0) throw new ForbiddenException('Add at least one lesson before publishing');
      return this.prisma.course.update({
        where: { id: courseId },
        data: { status: 'PUBLISHED', published: true },
      });
    }

    const sections = dto.sections ?? [];
    const advanceInfo = dto.advanceInfo;

    return this.prisma.$transaction(
      async (tx) => {
        await tx.section.deleteMany({ where: { courseId } });

        for (const section of sections) {
          const createdSection = await tx.section.create({
            data: { title: section.title, order: section.order, courseId },
          });

          if (section.lectures.length) {
            await tx.lecture.createMany({
              data: section.lectures.map((lecture) => ({
                title: lecture.title,
                order: lecture.order,
                videoUrl: lecture.videoUrl,
                videoFileName: lecture.videoFileName,
                quiz: lecture.quiz ? (lecture.quiz as any) : undefined,
                sectionId: createdSection.id,
              })),
            });
          }
        }

        return tx.course.update({
          where: { id: courseId },
          data: {
            title: dto.basicInfo!.title,
            description: dto.basicInfo!.description,
            category: dto.basicInfo!.categoryId,
            subCategory: dto.basicInfo!.subCategoryId,
            topic: dto.basicInfo!.topic,
            language: dto.basicInfo!.language,
            subtitleLanguage: dto.basicInfo!.subtitleLanguage,
            levelId: dto.basicInfo!.levelId,
            duration: dto.basicInfo!.duration,
            thumbnailUrl: advanceInfo?.thumbnailUrl,
            trailerUrl: advanceInfo?.trailerUrl,
            learningPoints: advanceInfo?.learningPoints,
            requirements: advanceInfo?.requirements,
            tags: advanceInfo?.tags,
            status: 'PUBLISHED',
            published: true,
          },
        });
      },
      { timeout: 15000 }, // raised from Prisma's 5000ms default
    );
  }

  async listMine(teacherId: string) {
    return this.prisma.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * A teacher may only publish a course that sits in their own school. Reading
   * both sides from the database means a forged schoolId in a payload cannot
   * move a course into another tenant.
   */
  private async assertPublishableBy(teacherId: string, courseId: string) {
    const [author, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true, role: true } }),
      this.prisma.course.findUnique({ where: { id: courseId }, select: { schoolId: true } }),
    ]);
    if (!course) throw new NotFoundException('Course not found');
    if (author?.role === 'ADMIN' || author?.role === 'SUPER_ADMIN') return;
    if (course.schoolId && course.schoolId !== author?.schoolId) {
      throw new ForbiddenException('You cannot publish into another school');
    }
  }

  private async assertOwnedDraft(teacherId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== teacherId) throw new ForbiddenException('Not your course');
    return course;
  }


  async listPublished() {
  return this.prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
  });
}

async getPublished(id: string) {
  const course = await this.prisma.course.findUnique({
    where: { id, published: true },
    include: { sections: { include: { lectures: true }, orderBy: { order: 'asc' } } },
  });
  if (!course) throw new NotFoundException('Course not found');
  return course;
}

  // =========================================================================
  // School LMS course API
  // =========================================================================

  /** Create a course from the LMS builder (as opposed to the 3-step wizard). */
  async create(tenant: TenantContext, dto: CreateCourseDto) {
    const schoolId = this.tenants.resolveWriteSchool(tenant, dto.schoolId);
    const slug = await this.uniqueSlug(dto.title);

    const course = await this.prisma.course.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description ?? '',
        subjectId: dto.subjectId ?? null,
        gradeId: dto.gradeId ?? null,
        ageBand: dto.ageBand ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        trailerUrl: dto.trailerUrl ?? null,
        objectives: dto.objectives ?? [],
        learningPoints: dto.learningPoints ?? [],
        requirements: dto.requirements ?? [],
        tags: dto.tags ?? [],
        // A non-admin may not create a PUBLIC course; it stays school-scoped.
        visibility: tenant.isPlatformAdmin ? dto.visibility ?? 'SCHOOL' : 'SCHOOL',
        accessType: dto.accessType ?? 'FREE',
        prerequisiteCourseId: dto.prerequisiteCourseId ?? null,
        schoolId,
        teacherId: tenant.userId,
        status: 'DRAFT',
        published: false,
      },
    });

    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'course.create', entity: 'Course',
      entityId: course.id, meta: { title: course.title },
    });
    return course;
  }

  async updateCourse(tenant: TenantContext, id: string, dto: UpdateCourseDto) {
    await this.access.assertCanEdit(tenant, id);
    // schoolId is intentionally not updatable here: moving a course between
    // tenants is an admin operation, not an edit.
    return this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: dto.subjectId,
        gradeId: dto.gradeId,
        ageBand: dto.ageBand,
        thumbnailUrl: dto.thumbnailUrl,
        trailerUrl: dto.trailerUrl,
        objectives: dto.objectives,
        learningPoints: dto.learningPoints,
        requirements: dto.requirements,
        tags: dto.tags,
        accessType: dto.accessType,
        prerequisiteCourseId: dto.prerequisiteCourseId,
        visibility: tenant.isPlatformAdmin ? dto.visibility : undefined,
      },
    });
  }

  async setPublished(tenant: TenantContext, id: string, published: boolean) {
    await this.access.assertCanPublish(tenant, id);
    if (published) {
      const lessons = await this.prisma.lesson.count({ where: { courseId: id } });
      if (lessons === 0) {
        throw new ForbiddenException('Add at least one lesson before publishing');
      }
    }
    const course = await this.prisma.course.update({
      where: { id },
      data: { published, status: published ? 'PUBLISHED' : 'DRAFT' },
    });
    await this.audit.record({
      actorId: tenant.userId, schoolId: course.schoolId,
      action: published ? 'course.publish' : 'course.unpublish',
      entity: 'Course', entityId: id, meta: { title: course.title },
    });
    return course;
  }

  async remove(tenant: TenantContext, id: string) {
    const course = await this.access.assertCanEdit(tenant, id);
    if (course.published) {
      throw new ForbiddenException('Unpublish the course before deleting it');
    }
    const enrolled = await this.prisma.enrollment.count({ where: { courseId: id } });
    if (enrolled > 0) {
      throw new ForbiddenException(
        'Students are enrolled in this course. Unpublish it instead of deleting it.',
      );
    }
    await this.prisma.course.delete({ where: { id } });
    await this.audit.record({
      actorId: tenant.userId, schoolId: course.schoolId, action: 'course.delete',
      entity: 'Course', entityId: id, meta: { title: course.title },
    });
    return { ok: true };
  }

  /** Courses the signed-in staff member may manage. */
  listForStaff(tenant: TenantContext, query: CatalogQueryDto) {
    const where: Prisma.CourseWhereInput = { AND: [this.access.staffFilter(tenant)] };
    const and = where.AND as Prisma.CourseWhereInput[];
    if (query.gradeId) and.push({ gradeId: query.gradeId });
    if (query.subject) and.push({ subject: { slug: query.subject } });
    if (query.status === 'published') and.push({ published: true });
    if (query.status === 'draft') and.push({ published: false });
    if (query.q) and.push({ title: { contains: query.q, mode: 'insensitive' } });

    return this.prisma.course.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        subject: { select: { id: true, name: true, slug: true, accent: true } },
        grade: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { lessons: true, sections: true, enrollments: true } },
      },
    });
  }

  /** The student catalog: only what this learner is allowed to open. */
  async catalog(tenant: TenantContext, query: CatalogQueryDto) {
    const pageSize = Math.min(query.pageSize ?? 24, 60);
    const page = query.page ?? 1;

    const where: Prisma.CourseWhereInput = { AND: [this.access.learnerFilter(tenant)] };
    const and = where.AND as Prisma.CourseWhereInput[];
    if (query.subject) and.push({ subject: { slug: query.subject } });
    if (query.gradeId) and.push({ gradeId: query.gradeId });
    if (query.q) and.push({ title: { contains: query.q, mode: 'insensitive' } });

    const [rows, total, progress] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subject: { select: { id: true, name: true, slug: true, accent: true } },
          grade: { select: { id: true, name: true } },
          _count: { select: { lessons: true } },
        },
      }),
      this.prisma.course.count({ where }),
      this.prisma.courseProgress.findMany({
        where: { studentId: tenant.userId },
        select: { courseId: true, percent: true, completed: true },
      }),
    ]);

    const byCourse = new Map(progress.map((p) => [p.courseId, p]));
    return {
      rows: rows.map((c) => ({
        ...c,
        progress: byCourse.get(c.id)?.percent ?? 0,
        completed: byCourse.get(c.id)?.completed ?? false,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** The full learning tree for a course the learner may open. */
  async learnerView(tenant: TenantContext, id: string) {
    await this.access.assertCanLearn(tenant, id);

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        subject: true,
        grade: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                activities: { orderBy: { order: 'asc' }, select: { id: true, title: true, type: true, order: true, points: true } },
                quiz: { select: { id: true, title: true, passingScore: true } },
              },
            },
            quizzes: { select: { id: true, title: true, passingScore: true } },
            assignments: { where: { published: true }, select: { id: true, title: true, dueAt: true, points: true } },
          },
        },
        lessons: { where: { sectionId: null }, orderBy: { order: 'asc' } },
        exams: { where: { published: true }, select: { id: true, title: true, passingScore: true, timeLimitMin: true, maxAttempts: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const lessonIds = [
      ...course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
      ...course.lessons.map((l) => l.id),
    ];
    const done = await this.prisma.progress.findMany({
      where: { userId: tenant.userId, lessonId: { in: lessonIds }, completed: true },
      select: { lessonId: true },
    });
    const completed = new Set(done.map((d) => d.lessonId));

    return {
      ...course,
      completedLessonIds: [...completed],
      progressPercent: lessonIds.length
        ? Math.round((completed.size / lessonIds.length) * 100)
        : 0,
    };
  }

  /** Self-enrol into a course the learner is already allowed to see. */
  async enroll(tenant: TenantContext, courseId: string) {
    await this.access.assertCanLearn(tenant, courseId);
    return this.prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId, studentId: tenant.userId } },
      update: { status: 'ACTIVE' },
      create: { courseId, studentId: tenant.userId, status: 'ACTIVE' },
    });
  }

  /** Teacher/admin enrols someone else — the target must share the school. */
  async enrollStudent(tenant: TenantContext, courseId: string, studentId: string) {
    const course = await this.access.assertCanEdit(tenant, courseId);
    if (!tenant.isPlatformAdmin) {
      const student = await this.prisma.user.findFirst({
        where: { id: studentId, schoolId: tenant.schoolId ?? '__none__' },
        select: { id: true },
      });
      if (!student) throw new ForbiddenException('Student is not in your school');
    }
    return this.prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      update: { status: 'ACTIVE', grantedBy: tenant.userId },
      create: { courseId, studentId, status: 'ACTIVE', grantedBy: tenant.userId },
    });
  }
}


