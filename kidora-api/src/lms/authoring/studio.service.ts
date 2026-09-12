import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AuthoringService } from './authoring.service';

export interface ReadinessLine {
  key: string;
  label: string;
  count: number;
  ok: boolean;
  required: boolean;
  detail?: string;
}

/**
 * The parts of the course studio that sit outside the plain content tree:
 * learning outcomes, co-instructors, per-item publishing, module exams, the
 * published-version history, and the readiness summary the publish screen
 * counts up.
 */
@Injectable()
export class StudioService {
  constructor(private prisma: PrismaService, private authoring: AuthoringService) {}

  /* ------------------------------------------------------ learning outcomes */

  /** Course-level outcomes, or a module's when `sectionId` is given. */
  async listOutcomes(u: AuthUser, courseId: string, sectionId?: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.learningOutcome.findMany({
      where: { courseId, sectionId: sectionId ?? null },
      orderBy: { order: 'asc' },
    });
  }

  async addOutcome(u: AuthUser, courseId: string, dto: { text: string; sectionId?: string }) {
    await this.authoring.assertAuthor(u, courseId);
    if (dto.sectionId) await this.assertSectionInCourse(dto.sectionId, courseId);
    const last = await this.prisma.learningOutcome.findFirst({
      where: { courseId, sectionId: dto.sectionId ?? null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const outcome = await this.prisma.learningOutcome.create({
      data: { courseId, sectionId: dto.sectionId ?? null, text: dto.text.trim(), order: (last?.order ?? -1) + 1 },
    });
    await this.mirrorCourseOutcomes(courseId);
    return outcome;
  }

  async updateOutcome(u: AuthUser, id: string, dto: { text?: string }) {
    const row = await this.outcomeOr404(id);
    await this.authoring.assertAuthor(u, row.courseId);
    const updated = await this.prisma.learningOutcome.update({
      where: { id },
      data: { text: dto.text?.trim() },
    });
    await this.mirrorCourseOutcomes(row.courseId);
    return updated;
  }

  async deleteOutcome(u: AuthUser, id: string) {
    const row = await this.outcomeOr404(id);
    await this.authoring.assertAuthor(u, row.courseId);
    await this.prisma.learningOutcome.delete({ where: { id } });
    await this.mirrorCourseOutcomes(row.courseId);
    return { ok: true };
  }

  async reorderOutcomes(u: AuthUser, courseId: string, ids: string[], sectionId?: string) {
    await this.authoring.assertAuthor(u, courseId);
    const owned = await this.prisma.learningOutcome.findMany({
      where: { courseId, sectionId: sectionId ?? null }, select: { id: true },
    });
    const set = new Set(owned.map((o) => o.id));
    if (ids.length !== set.size || ids.some((id) => !set.has(id))) {
      throw new BadRequestException('The order must list every outcome exactly once.');
    }
    await this.prisma.$transaction(ids.map((id, order) => this.prisma.learningOutcome.update({ where: { id }, data: { order } })));
    await this.mirrorCourseOutcomes(courseId);
    return this.listOutcomes(u, courseId, sectionId);
  }

  /**
   * Course.learningPoints is the string array the student pages and the
   * publish checklist already read. Outcomes are now rows, so the array is
   * kept in step rather than leaving two sources of truth to drift apart.
   */
  private async mirrorCourseOutcomes(courseId: string) {
    const rows = await this.prisma.learningOutcome.findMany({
      where: { courseId, sectionId: null }, orderBy: { order: 'asc' }, select: { text: true },
    });
    await this.prisma.course.update({ where: { id: courseId }, data: { learningPoints: rows.map((r) => r.text) } });
  }

  /* ---------------------------------------------------------- instructors */

  async listInstructors(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.courseInstructor.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
    });
  }

  async addInstructor(u: AuthUser, courseId: string, dto: { email: string; role?: 'LEAD' | 'CO_INSTRUCTOR' | 'ASSISTANT'; bio?: string }) {
    const course = await this.authoring.assertAuthor(u, courseId);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { id: true, role: true, schoolId: true, name: true },
    });
    if (!user) throw new NotFoundException('No Kidora account with that email.');
    if (user.role !== 'TEACHER' && user.role !== 'SCHOOL_ADMIN' && user.role !== 'SCHOOL_LEADER') {
      throw new BadRequestException('Only a teacher can be added as an instructor.');
    }
    // A school course stays within its school.
    if (course.schoolId && user.schoolId !== course.schoolId) {
      throw new BadRequestException('That teacher is not at this school.');
    }
    const last = await this.prisma.courseInstructor.findFirst({
      where: { courseId }, orderBy: { order: 'desc' }, select: { order: true },
    });
    return this.prisma.courseInstructor.create({
      data: { courseId, userId: user.id, role: dto.role ?? 'CO_INSTRUCTOR', bio: dto.bio, order: (last?.order ?? -1) + 1 },
      include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
    });
  }

  async removeInstructor(u: AuthUser, courseId: string, instructorId: string) {
    await this.authoring.assertAuthor(u, courseId);
    const row = await this.prisma.courseInstructor.findUnique({ where: { id: instructorId }, select: { courseId: true, userId: true } });
    if (!row || row.courseId !== courseId) throw new NotFoundException('Instructor not found on this course.');
    await this.prisma.courseInstructor.delete({ where: { id: instructorId } });
    return { ok: true };
  }

  /* ------------------------------------------------------------ item status */

  /**
   * Publish, unpublish or archive one item.
   *
   * An item's lifecycle is its own: a teacher can leave a half-written video
   * in a published course without students seeing it.
   */
  async setItemStatus(u: AuthUser, itemId: string, status: ItemStatus) {
    const item = await this.prisma.lessonContent.findUnique({
      where: { id: itemId },
      select: { id: true, type: true, url: true, body: true, lesson: { select: { courseId: true } } },
    });
    if (!item) throw new NotFoundException('Item not found.');
    await this.authoring.assertAuthor(u, item.lesson.courseId);

    if (status === 'PUBLISHED') {
      const empty = !item.url?.trim() && !item.body?.trim();
      const needsSomething = !['HEADING'].includes(item.type);
      if (needsSomething && empty) {
        throw new BadRequestException('This item is empty. Add a file or some text before publishing it.');
      }
    }
    return this.prisma.lessonContent.update({ where: { id: itemId }, data: { status } });
  }

  /* ----------------------------------------------------------- module exams */

  /** The exam for one module, or the course final when sectionId is absent. */
  async getExam(u: AuthUser, courseId: string, sectionId?: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.exam.findFirst({
      where: { courseId, sectionId: sectionId ?? null },
      include: { quiz: { include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { attempts: true } } } } },
    });
  }

  async listExams(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.exam.findMany({
      where: { courseId },
      orderBy: [{ sectionId: { sort: 'asc', nulls: 'last' } }],
      include: {
        section: { select: { id: true, title: true, weekNumber: true, order: true } },
        quiz: { select: { id: true, _count: { select: { questions: true, attempts: true } } } },
      },
    });
  }

  /* -------------------------------------------------------------- versions */

  /** A snapshot of the tree exactly as published. */
  async snapshot(courseId: string, publishedById: string, note?: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        outcomes: { orderBy: { order: 'asc' }, select: { text: true, sectionId: true } },
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, description: true, order: true, weekNumber: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, order: true, estimatedMin: true, isRequired: true, status: true,
                contents: {
                  orderBy: { order: 'asc' },
                  select: { id: true, type: true, title: true, order: true, estimatedMin: true, isRequired: true, status: true, quizId: true, assignmentId: true },
                },
              },
            },
          },
        },
        exams: { select: { id: true, title: true, sectionId: true, passingScore: true, durationMin: true } },
        assignments: { select: { id: true, title: true, maxScore: true, isRequired: true, peerReviewCount: true } },
        quizzes: { select: { id: true, title: true, grading: true, isRequired: true, lessonId: true } },
      },
    });
    const last = await this.prisma.courseVersion.findFirst({
      where: { courseId }, orderBy: { version: 'desc' }, select: { version: true },
    });
    return this.prisma.courseVersion.create({
      data: {
        courseId,
        version: (last?.version ?? 0) + 1,
        publishedById,
        note,
        snapshot: course as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, version: true, createdAt: true, note: true },
    });
  }

  async listVersions(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.courseVersion.findMany({
      where: { courseId },
      orderBy: { version: 'desc' },
      select: {
        id: true, version: true, note: true, createdAt: true,
        publishedBy: { select: { id: true, name: true } },
      },
    });
  }

  /* -------------------------------------------------------------- readiness */

  /**
   * The counts the publish screen shows: how many modules, lessons, videos,
   * readings, quizzes, and what is missing. Separate from the blocking
   * checklist, which decides whether publishing is allowed at all.
   */
  async readiness(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        id: true, title: true, status: true, thumbnailUrl: true, access: true,
        issuesCertificate: true, passingScore: true, requireFinalExam: true,
        // Course-level objectives only: a module's outcomes are not what the
        // publish screen is asking about.
        outcomes: { where: { sectionId: null }, select: { id: true } },
        _count: { select: { instructors: true } },
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, weekNumber: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, status: true,
                contents: { select: { type: true, status: true } },
              },
            },
          },
        },
        exams: { select: { id: true, sectionId: true, quiz: { select: { _count: { select: { questions: true } } } } } },
        quizzes: { select: { id: true, grading: true, _count: { select: { questions: true } } } },
        assignments: { select: { id: true } },
      },
    });

    const lessons = course.sections.flatMap((s) => s.lessons);
    const items = lessons.flatMap((l) => l.contents);
    const live = items.filter((i) => i.status === 'PUBLISHED');
    const count = (t: string) => live.filter((i) => i.type === t).length;
    const finalExam = course.exams.find((e) => !e.sectionId);
    const moduleExams = course.exams.filter((e) => e.sectionId);
    const emptyLessons = lessons.filter((l) => l.contents.filter((c) => c.status === 'PUBLISHED').length === 0);

    const lines: ReadinessLine[] = [
      { key: 'basics', label: 'Course information', count: 1, required: true, ok: course.title.trim().length >= 2 },
      { key: 'thumbnail', label: 'Thumbnail', count: course.thumbnailUrl ? 1 : 0, required: false, ok: Boolean(course.thumbnailUrl) },
      { key: 'outcomes', label: 'Learning objectives', count: course.outcomes.length, required: true, ok: course.outcomes.length > 0 },
      { key: 'modules', label: 'Modules', count: course.sections.length, required: true, ok: course.sections.length > 0 },
      { key: 'lessons', label: 'Lessons', count: lessons.length, required: true, ok: lessons.length > 0 },
      { key: 'videos', label: 'Videos', count: count('VIDEO'), required: false, ok: true },
      { key: 'readings', label: 'Readings', count: count('DOCUMENT') + count('PARAGRAPH'), required: false, ok: true },
      { key: 'quizzes', label: 'Quizzes', count: course.quizzes.filter((q) => q._count.questions > 0).length, required: false, ok: true },
      { key: 'assignments', label: 'Assignments', count: course.assignments.length, required: false, ok: true },
      {
        key: 'emptyLessons', label: 'Every lesson has content',
        count: lessons.length - emptyLessons.length, required: true, ok: emptyLessons.length === 0,
        detail: emptyLessons.length ? `Empty: ${emptyLessons.slice(0, 3).map((l) => l.title).join(', ')}` : undefined,
      },
      {
        key: 'moduleExams', label: 'Module exams',
        count: moduleExams.length, required: false, ok: true,
        detail: moduleExams.length ? undefined : 'Optional — an end-of-module exam per week.',
      },
      {
        key: 'finalExam', label: 'Final assessment',
        count: finalExam ? 1 : 0,
        required: course.requireFinalExam,
        ok: course.requireFinalExam ? Boolean(finalExam && finalExam.quiz._count.questions > 0) : true,
        detail: course.requireFinalExam && !finalExam ? 'Completion requires a final exam and there is none.' : undefined,
      },
      {
        key: 'certificate', label: 'Certificate',
        count: course.issuesCertificate ? 1 : 0, required: false, ok: true,
        detail: course.issuesCertificate ? `Issued at ${course.passingScore}%` : 'No certificate for this course.',
      },
    ];

    return {
      status: course.status,
      access: course.access,
      lines,
      blockers: lines.filter((l) => l.required && !l.ok).map((l) => l.detail ?? l.label),
      ready: lines.every((l) => !l.required || l.ok),
    };
  }

  /* ---------------------------------------------------------------- helpers */

  private async outcomeOr404(id: string) {
    const row = await this.prisma.learningOutcome.findUnique({ where: { id }, select: { id: true, courseId: true } });
    if (!row) throw new NotFoundException('Outcome not found.');
    return row;
  }

  private async assertSectionInCourse(sectionId: string, courseId: string) {
    const s = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { courseId: true } });
    if (!s) throw new NotFoundException('Module not found.');
    if (s.courseId !== courseId) throw new BadRequestException('That module belongs to another course.');
  }
}
