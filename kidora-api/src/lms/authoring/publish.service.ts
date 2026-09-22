import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AuthoringService } from './authoring.service';
import { StudioService } from './studio.service';

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  /** Why it is not satisfied — shown next to the item in the wizard. */
  detail?: string;
}
export interface PublishChecklist {
  ready: boolean;
  items: ChecklistItem[];
  blockers: string[];
}

/**
 * Publish validation (spec §12).
 *
 * The checklist is computed on the server and is also what `publish` enforces,
 * so a teacher cannot skip it by posting straight to the publish endpoint.
 */
@Injectable()
export class PublishService {
  constructor(private prisma: PrismaService, private authoring: AuthoringService, private studio: StudioService) {}

  async checklist(u: AuthUser, courseId: string): Promise<PublishChecklist> {
    await this.authoring.assertAuthor(u, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              // Published items only: a lesson made entirely of drafts shows a
              // student nothing, so it must count as empty here.
              include: { _count: { select: { contents: { where: { status: 'PUBLISHED' } } } } },
            },
          },
        },
        quizzes: { include: { _count: { select: { questions: true } } } },
        assignments: true,
        exams: { include: { quiz: { include: { _count: { select: { questions: true } } } } } },
      },
    });

    const lessons = course.sections.flatMap((s) => s.lessons);
    const requiredLessons = lessons.filter((l) => l.isRequired);
    const emptyLessons = requiredLessons.filter((l) => l._count.contents === 0 && !l.videoUrl);
    const emptyQuizzes = course.quizzes.filter((q) => q.kind !== 'FINAL_EXAM' && q._count.questions === 0);
    const brokenAssignments = course.assignments.filter((a) => !a.instructions.trim() && !a.description.trim());
    const exam = course.exams[0];

    const items: ChecklistItem[] = [
      {
        key: 'title', label: 'Course title', required: true,
        ok: course.title.trim().length >= 2,
        detail: course.title.trim().length >= 2 ? undefined : 'Give the course a title.',
      },
      {
        key: 'description', label: 'Description', required: true,
        ok: course.description.trim().length >= 20,
        detail: course.description.trim().length >= 20 ? undefined : 'Write at least a couple of sentences describing the course.',
      },
      {
        key: 'subject', label: 'Subject', required: true,
        ok: Boolean(course.subjectId),
        detail: course.subjectId ? undefined : 'Choose a subject.',
      },
      {
        key: 'grade', label: 'Grade or age band', required: true,
        ok: Boolean(course.gradeId || course.ageBand),
        detail: course.gradeId || course.ageBand ? undefined : 'Choose a grade or set an age band.',
      },
      {
        key: 'thumbnail', label: 'Thumbnail', required: false,
        ok: Boolean(course.thumbnailUrl),
        detail: course.thumbnailUrl ? undefined : 'Courses with a thumbnail get opened more often.',
      },
      {
        key: 'structure', label: 'At least one module', required: true,
        ok: course.sections.length > 0,
        detail: course.sections.length ? undefined : 'Add a module in the Curriculum step.',
      },
      {
        key: 'lessons', label: 'At least one lesson', required: true,
        ok: lessons.length > 0,
        detail: lessons.length ? undefined : 'Add a lesson to a module.',
      },
      {
        key: 'lessonContent', label: 'Every required lesson has content', required: true,
        ok: emptyLessons.length === 0,
        detail: emptyLessons.length
          ? `${emptyLessons.length} required lesson(s) are empty: ${emptyLessons.slice(0, 3).map((l) => l.title).join(', ')}`
          : undefined,
      },
      {
        key: 'quizzes', label: 'Quizzes have questions', required: true,
        ok: emptyQuizzes.length === 0,
        detail: emptyQuizzes.length
          ? `${emptyQuizzes.length} quiz(zes) have no questions: ${emptyQuizzes.slice(0, 3).map((q) => q.title).join(', ')}`
          : undefined,
      },
      {
        key: 'assignments', label: 'Assignments have instructions', required: true,
        ok: brokenAssignments.length === 0,
        detail: brokenAssignments.length
          ? `${brokenAssignments.length} assignment(s) have no instructions: ${brokenAssignments.slice(0, 3).map((a) => a.title).join(', ')}`
          : undefined,
      },
      {
        key: 'exam',
        label: course.requireFinalExam ? 'Final exam (required by completion rules)' : 'Final exam',
        required: course.requireFinalExam,
        ok: course.requireFinalExam ? Boolean(exam && exam.quiz._count.questions > 0) : true,
        detail: course.requireFinalExam && !(exam && exam.quiz._count.questions > 0)
          ? 'Completion requires a final exam, but none has questions yet.'
          : undefined,
      },
      {
        key: 'certificate', label: 'Certificate', required: false,
        ok: !course.issuesCertificate || Boolean(course.title),
        detail: course.issuesCertificate ? undefined : 'No certificate is issued for this course.',
      },
    ];

    const blockers = items.filter((i) => i.required && !i.ok).map((i) => i.detail ?? i.label);
    return { ready: blockers.length === 0, items, blockers };
  }

  async publish(u: AuthUser, courseId: string) {
    const check = await this.checklist(u, courseId);
    if (!check.ready) {
      throw new BadRequestException({
        message: 'This course is not ready to publish.',
        blockers: check.blockers,
        checklist: check.items,
      });
    }
    const course = await this.prisma.$transaction(async (tx) => {
      // A draft lesson would be invisible to students in a published course,
      // which reads as "my course published but is empty". Publish them with it.
      await tx.lesson.updateMany({ where: { courseId, status: 'DRAFT' }, data: { status: 'PUBLISHED' } });
      return tx.course.update({
        where: { id: courseId },
        data: { status: 'PUBLISHED', published: true, publishedAt: new Date(), archivedAt: null },
        include: { _count: { select: { lessons: true, enrollments: true } } },
      });
    });
    // Record what students were actually shown, after the publish committed.
    const version = await this.studio.snapshot(courseId, u.id);
    return { ...course, version };
  }

  async archive(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    // Archiving hides the course from browse but leaves enrolled students
    // their access and their progress — it is not a delete.
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'ARCHIVED', published: false, archivedAt: new Date() },
    });
  }

  /**
   * Take a live course down. UNPUBLISHED rather than DRAFT: it has been
   * published before, and students already enrolled keep their access.
   */
  async unpublish(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'UNPUBLISHED', published: false },
    });
  }

  async submitForReview(u: AuthUser, courseId: string) {
    const check = await this.checklist(u, courseId);
    if (!check.ready) {
      throw new BadRequestException({ message: 'This course is not ready for review.', blockers: check.blockers });
    }
    await this.authoring.assertAuthor(u, courseId);
    return this.prisma.course.update({ where: { id: courseId }, data: { status: 'REVIEW' } });
  }

  /**
   * The course exactly as a student would first see it (spec §11) — built from
   * the same shape the student landing page reads, so the preview cannot drift
   * away from the real thing.
   */
  async preview(u: AuthUser, courseId: string) {
    await this.authoring.assertAuthor(u, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        subject: { select: { name: true, accent: true } },
        grade: { select: { name: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, description: true, type: true, estimatedMin: true,
                isRequired: true, status: true, objectives: true,
                _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
              },
            },
          },
        },
        quizzes: { select: { id: true, title: true, lessonId: true, sectionId: true, isRequired: true, passingScore: true, _count: { select: { questions: true } } } },
        assignments: { select: { id: true, title: true, dueAt: true, maxScore: true, isRequired: true, lessonId: true } },
        exams: { select: { id: true, title: true, durationMin: true, passingScore: true, quiz: { select: { _count: { select: { questions: true } } } } } },
      },
    });
    const lessons = course.sections.flatMap((s) => s.lessons);
    return {
      ...course,
      totals: {
        modules: course.sections.length,
        lessons: lessons.length,
        estimatedMinutes: course.estimatedMinutes ?? lessons.reduce((a, l) => a + l.estimatedMin, 0),
        quizzes: course.quizzes.filter((q) => q._count.questions > 0).length,
        assignments: course.assignments.length,
        hasExam: course.exams.length > 0,
      },
      completionRules: {
        requireAllLessons: course.requireAllLessons,
        requireAllQuizzes: course.requireAllQuizzes,
        requireAllAssignments: course.requireAllAssignments,
        requireFinalExam: course.requireFinalExam,
        passingScore: course.passingScore,
        issuesCertificate: course.issuesCertificate,
      },
    };
  }
}
