import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type LessonStatus, ResourceKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../common/tenancy.service';
import { PaginationDto, paginate, skip } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ResourceDto } from '../authoring/dto';

/**
 * The cross-course views behind the teacher's Lessons, Quizzes and Resources
 * pages. Everything is scoped to courses the teacher authors or teaches —
 * there is no "all lessons on the platform" query here.
 */
@Injectable()
export class TeacherLibraryService {
  constructor(private prisma: PrismaService, private tenancy: TenancyService) {}

  /** Course ids this teacher may see: ones they wrote, plus ones their classes are assigned. */
  private async visibleCourseIds(u: AuthUser) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const rows = await this.prisma.course.findMany({
      where: { OR: [{ teacherId: u.id }, { classCourses: { some: { classId: { in: classIds } } } }] },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async lessons(u: AuthUser, q: PaginationDto & { courseId?: string; status?: string }) {
    const courseIds = await this.visibleCourseIds(u);
    const status: LessonStatus | undefined =
      q.status === 'DRAFT' || q.status === 'PUBLISHED' ? q.status : undefined;
    const where: Prisma.LessonWhereInput = {
      courseId: q.courseId && courseIds.includes(q.courseId) ? q.courseId : { in: courseIds },
      ...(status ? { status } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where, skip: skip(q), take: q.pageSize, orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true, title: true, type: true, status: true, estimatedMin: true, isRequired: true,
          order: true, updatedAt: true,
          section: { select: { id: true, title: true } },
          course: { select: { id: true, title: true, subject: { select: { name: true, accent: true } } } },
          _count: {
            select: {
              contents: { where: { status: 'PUBLISHED' } },
              progress: { where: { completed: true } },
            },
          },
        },
      }),
      this.prisma.lesson.count({ where }),
    ]);
    return paginate(
      rows.map((l) => ({
        id: l.id, title: l.title, type: l.type, status: l.status, estimatedMin: l.estimatedMin,
        isRequired: l.isRequired, order: l.order, updatedAt: l.updatedAt,
        section: l.section, course: { id: l.course.id, title: l.course.title },
        subject: l.course.subject?.name ?? 'General', subjectAccent: l.course.subject?.accent,
        blockCount: l._count.contents, // published items — what a student would see
        completedBy: l._count.progress,
        hasContent: l._count.contents > 0,
      })),
      total, q,
    );
  }

  async quizzes(u: AuthUser, q: PaginationDto & { courseId?: string; kind?: string }) {
    const courseIds = await this.visibleCourseIds(u);
    const where = {
      OR: [
        { courseId: q.courseId && courseIds.includes(q.courseId) ? q.courseId : { in: courseIds } },
        { lesson: { courseId: { in: courseIds } } },
      ],
      ...(q.kind === 'FINAL_EXAM' ? { kind: 'FINAL_EXAM' as const } : { kind: { not: 'FINAL_EXAM' as const } }),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where, skip: skip(q), take: q.pageSize, orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, published: true, passingScore: true, maxAttempts: true,
          timeLimitSec: true, isRequired: true, createdAt: true,
          course: { select: { id: true, title: true } },
          lesson: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
          _count: { select: { questions: true, attempts: true } },
          attempts: { where: { status: { not: 'IN_PROGRESS' } }, select: { percent: true, passed: true } },
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);
    return paginate(
      rows.map((z) => {
        const done = z.attempts;
        return {
          id: z.id, title: z.title, published: z.published, passingScore: z.passingScore,
          maxAttempts: z.maxAttempts, timeLimitSec: z.timeLimitSec, isRequired: z.isRequired,
          createdAt: z.createdAt,
          course: z.course ?? z.lesson?.course ?? null,
          lesson: z.lesson ? { id: z.lesson.id, title: z.lesson.title } : null,
          questionCount: z._count.questions,
          attemptCount: done.length,
          averagePercent: done.length ? Math.round(done.reduce((a, x) => a + x.percent, 0) / done.length) : null,
          passRate: done.length ? Math.round((done.filter((x) => x.passed).length / done.length) * 100) : null,
        };
      }),
      total, q,
    );
  }

  /** Final exams across every course this teacher can see. */
  async exams(u: AuthUser, q: PaginationDto & { status?: string }) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const where = {
      OR: [{ teacherId: u.id }, { classId: { in: classIds } }],
      ...(q.status ? { status: q.status as 'DRAFT' } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.exam.findMany({
        where, skip: skip(q), take: q.pageSize, orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'last' } }],
        select: {
          id: true, title: true, status: true, scheduledAt: true, availableFrom: true, availableUntil: true,
          durationMin: true, passingScore: true, issuesCertificate: true,
          course: { select: { id: true, title: true } },
          class: { select: { id: true, name: true } },
          quiz: { select: { id: true, _count: { select: { questions: true } } } },
          attempts: { where: { status: { not: 'IN_PROGRESS' } }, select: { percent: true, passed: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);
    return paginate(
      rows.map((x) => ({
        id: x.id, title: x.title, status: x.status, scheduledAt: x.scheduledAt,
        availableFrom: x.availableFrom, availableUntil: x.availableUntil, durationMin: x.durationMin,
        passingScore: x.passingScore, issuesCertificate: x.issuesCertificate,
        course: x.course, class: x.class, quizId: x.quiz.id,
        questionCount: x.quiz._count.questions,
        sat: x.attempts.length,
        averagePercent: x.attempts.length ? Math.round(x.attempts.reduce((a, y) => a + y.percent, 0) / x.attempts.length) : null,
        passRate: x.attempts.length ? Math.round((x.attempts.filter((y) => y.passed).length / x.attempts.length) * 100) : null,
      })),
      total, q,
    );
  }

  /* ------------------------------------------------------------ resources */

  async resources(u: AuthUser, q: PaginationDto & { courseId?: string; kind?: string }) {
    const where = {
      // A teacher's own uploads, plus anything attached to a course they can see.
      OR: [{ teacherId: u.id }, { courseId: { in: await this.visibleCourseIds(u) } }],
      ...(q.courseId ? { courseId: q.courseId } : {}),
      ...(q.kind && q.kind in ResourceKind ? { kind: q.kind as ResourceKind } : {}),
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.resource.findMany({
        where, skip: skip(q), take: q.pageSize, orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, description: true, url: true, kind: true, sizeBytes: true,
          mimeType: true, createdAt: true,
          course: { select: { id: true, title: true } },
          lesson: { select: { id: true, title: true } },
        },
      }),
      this.prisma.resource.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async addResource(u: AuthUser, dto: ResourceDto) {
    if (dto.courseId) await this.assertOwnsCourse(u, dto.courseId);
    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId }, select: { courseId: true } });
      if (!lesson) throw new NotFoundException('Lesson not found.');
      await this.assertOwnsCourse(u, lesson.courseId);
      if (dto.courseId && dto.courseId !== lesson.courseId) {
        throw new BadRequestException('That lesson is not in the course given.');
      }
    }
    return this.prisma.resource.create({
      data: {
        name: dto.name, url: dto.url, description: dto.description ?? '',
        courseId: dto.courseId ?? null, lessonId: dto.lessonId ?? null,
        teacherId: u.id, schoolId: u.schoolId, mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes ?? 0, kind: kindFor(dto.mimeType, dto.url),
      },
    });
  }

  /** Attach an existing library resource to a lesson, or detach it with lessonId null. */
  async attachResource(u: AuthUser, resourceId: string, lessonId: string | null) {
    const r = await this.prisma.resource.findUnique({ where: { id: resourceId }, select: { id: true, teacherId: true } });
    if (!r) throw new NotFoundException('Resource not found.');
    if (r.teacherId !== u.id) throw new ForbiddenException('That resource is not yours.');
    let courseId: string | null = null;
    if (lessonId) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
      if (!lesson) throw new NotFoundException('Lesson not found.');
      await this.assertOwnsCourse(u, lesson.courseId);
      courseId = lesson.courseId;
    }
    return this.prisma.resource.update({ where: { id: resourceId }, data: { lessonId, courseId } });
  }

  async deleteResource(u: AuthUser, resourceId: string) {
    const r = await this.prisma.resource.findUnique({ where: { id: resourceId }, select: { teacherId: true } });
    if (!r) throw new NotFoundException('Resource not found.');
    if (r.teacherId !== u.id) throw new ForbiddenException('That resource is not yours.');
    await this.prisma.resource.delete({ where: { id: resourceId } });
    return { ok: true };
  }

  private async assertOwnsCourse(u: AuthUser, courseId: string) {
    const c = await this.prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
    if (!c) throw new NotFoundException('Course not found.');
    if (c.teacherId !== u.id) throw new ForbiddenException('That course is not yours.');
  }
}

/** Best-effort bucket for the resource list's filter and icon. */
function kindFor(mimeType: string | undefined, url: string): ResourceKind {
  const probe = `${mimeType ?? ''} ${url}`.toLowerCase();
  if (/video|\.mp4|\.webm|\.mov/.test(probe)) return 'video';
  if (/image|\.png|\.jpe?g|\.gif|\.webp|\.svg/.test(probe)) return 'image';
  if (/pdf|msword|document|spreadsheet|presentation|\.pdf|\.docx?|\.pptx?|\.xlsx?/.test(probe)) return 'document';
  return 'other';
}
