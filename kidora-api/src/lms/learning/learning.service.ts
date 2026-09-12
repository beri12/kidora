import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../gamification/rewards.service';
import { CompletionService } from './completion.service';
import { paginate, skip } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { BrowseCoursesDto, LessonProgressDto } from './dto';

/** Why a course is or is not reachable — the frontend renders this, it does not decide it. */
export interface AccessDecision {
  allowed: boolean;
  reason?: 'NOT_PUBLISHED' | 'SCHOOL_ONLY' | 'PREMIUM' | 'INVITE_ONLY' | 'PREREQUISITE';
  message?: string;
  missingPrerequisites?: { id: string; title: string }[];
}

/**
 * The student-facing half of the LMS: browsing, enrolling, the lesson player
 * and progress.
 *
 * Every read is filtered by `assertCanAccess` on the server. A course id in
 * the URL is never enough on its own.
 */
@Injectable()
export class LearningService {
  constructor(
    private prisma: PrismaService,
    private rewards: RewardsService,
    private completion: CompletionService,
  ) {}

  /* ------------------------------------------------------------- browsing */

  async browse(u: AuthUser, q: BrowseCoursesDto) {
    const where = {
      published: true,
      status: 'PUBLISHED' as const,
      ...(q.subjectId ? { subjectId: q.subjectId } : {}),
      ...(q.gradeId ? { gradeId: q.gradeId } : {}),
      ...(q.difficulty ? { difficulty: q.difficulty } : {}),
      ...(q.language ? { language: q.language } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' as const } },
              { shortDescription: { contains: q.search, mode: 'insensitive' as const } },
              { topic: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      // A SCHOOL_ONLY course belongs to exactly one school; never list other
      // schools' courses, whatever filters were asked for.
      AND: [{ OR: [{ access: { not: 'SCHOOL_ONLY' as const } }, { schoolId: u.schoolId ?? '__none__' }] }],
    };

    const orderBy =
      q.sort === 'popular'
        ? ({ enrollments: { _count: 'desc' } } as const)
        : q.sort === 'title'
          ? ({ title: 'asc' } as const)
          : ({ publishedAt: { sort: 'desc', nulls: 'last' } } as const);

    const [rows, total] = await Promise.all([
      this.prisma.course.findMany({
        where, orderBy, skip: skip(q), take: q.pageSize,
        select: {
          id: true, slug: true, title: true, shortDescription: true, thumbnailUrl: true, accent: true,
          difficulty: true, access: true, language: true, estimatedMinutes: true, ageBand: true,
          publishedAt: true, issuesCertificate: true,
          subject: { select: { id: true, name: true, accent: true } },
          grade: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { lessons: { where: { status: 'PUBLISHED' } }, enrollments: true } },
          enrollments: { where: { studentId: u.id }, select: { status: true, progressPercent: true, lessonsCompleted: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const items = rows.map((c) => {
      const e = c.enrollments[0];
      return {
        id: c.id, slug: c.slug, title: c.title, shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl, accent: c.accent, difficulty: c.difficulty, access: c.access,
        language: c.language, ageBand: c.ageBand, estimatedMinutes: c.estimatedMinutes,
        issuesCertificate: c.issuesCertificate, publishedAt: c.publishedAt,
        subject: c.subject?.name ?? 'General', subjectAccent: c.subject?.accent ?? c.accent,
        grade: c.grade?.name ?? null,
        teacher: c.teacher ? { id: c.teacher.id, name: c.teacher.name, avatarUrl: c.teacher.avatarUrl } : null,
        totalLessons: c._count.lessons,
        studentCount: c._count.enrollments,
        enrolled: Boolean(e),
        enrollmentStatus: e?.status ?? null,
        progressPercent: e?.progressPercent ?? 0,
        lessonsCompleted: e?.lessonsCompleted ?? 0,
      };
    });

    // "progress" is a property of the viewer, not the row, so it is sorted here.
    if (q.sort === 'progress') items.sort((a, b) => b.progressPercent - a.progressPercent);
    return paginate(items, total, q);
  }

  /** The filter values the browse page offers, taken from courses that exist. */
  async browseFilters(u: AuthUser) {
    const [subjects, grades, languages] = await Promise.all([
      this.prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, accent: true } }),
      this.prisma.grade.findMany({
        where: { courses: { some: { published: true } } },
        orderBy: { level: 'asc' }, select: { id: true, name: true },
      }),
      this.prisma.course.findMany({
        where: { published: true, language: { not: null } },
        distinct: ['language'], select: { language: true },
      }),
    ]);
    return {
      subjects,
      grades,
      languages: languages.map((l) => l.language).filter((l): l is string => Boolean(l)).sort(),
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      sorts: [
        { value: 'newest', label: 'Newest' },
        { value: 'popular', label: 'Most popular' },
        { value: 'progress', label: 'My progress' },
        { value: 'title', label: 'A to Z' },
      ],
    };
  }

  /* ------------------------------------------------------- access control */

  /**
   * Decides whether this student may open this course. The rules live here so
   * that browse, detail, enrol and the player cannot disagree.
   */
  async accessDecision(u: AuthUser, courseId: string): Promise<AccessDecision> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, published: true, status: true, access: true, schoolId: true, teacherId: true,
        prerequisites: { select: { prerequisite: { select: { id: true, title: true } } } },
        enrollments: { where: { studentId: u.id }, select: { id: true, status: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const enrolled = course.enrollments.length > 0;
    // An already-enrolled student keeps access even if the course is later
    // archived or the access rule tightens — losing a course mid-way would be
    // worse than the rule being slightly stale.
    if (enrolled) return { allowed: true };

    if (!course.published || course.status !== 'PUBLISHED') {
      return { allowed: false, reason: 'NOT_PUBLISHED', message: 'This course is not published yet.' };
    }

    if (course.access === 'SCHOOL_ONLY' && (!u.schoolId || course.schoolId !== u.schoolId)) {
      return { allowed: false, reason: 'SCHOOL_ONLY', message: 'This course is only open to its school.' };
    }
    if (course.access === 'INVITE_ONLY') {
      return { allowed: false, reason: 'INVITE_ONLY', message: 'This course is invite only. Ask your teacher to add you.' };
    }
    if (course.access === 'PREMIUM') {
      const sub = await this.prisma.subscription.findFirst({
        where: { userId: u.id, status: 'ACTIVE' }, select: { id: true },
      });
      if (!sub) return { allowed: false, reason: 'PREMIUM', message: 'This course is part of Kidora Plus.' };
    }

    if (course.prerequisites.length) {
      const doneIds = await this.prisma.courseEnrollment.findMany({
        where: { studentId: u.id, status: 'COMPLETED', courseId: { in: course.prerequisites.map((p) => p.prerequisite.id) } },
        select: { courseId: true },
      });
      const done = new Set(doneIds.map((d) => d.courseId));
      const missing = course.prerequisites.map((p) => p.prerequisite).filter((p) => !done.has(p.id));
      if (missing.length) {
        return {
          allowed: false, reason: 'PREREQUISITE',
          message: 'Finish the earlier course first.', missingPrerequisites: missing,
        };
      }
    }
    return { allowed: true };
  }

  private async assertCanAccess(u: AuthUser, courseId: string) {
    const d = await this.accessDecision(u, courseId);
    if (!d.allowed) throw new ForbiddenException(d.message ?? 'You cannot open this course.');
  }

  /* ------------------------------------------------------------ enrolment */

  async enroll(u: AuthUser, courseId: string) {
    await this.assertCanAccess(u, courseId);
    const existing = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: u.id } },
    });
    if (existing) return existing; // idempotent: the button can be double-clicked

    const first = await this.firstLesson(courseId);
    return this.prisma.courseEnrollment.create({
      data: { courseId, studentId: u.id, lastLessonId: first?.id ?? null, lastActivityAt: new Date() },
    });
  }

  async unenroll(u: AuthUser, courseId: string) {
    // Progress rows are kept: re-enrolling should not wipe the work already done.
    await this.prisma.courseEnrollment.deleteMany({ where: { courseId, studentId: u.id } });
    return { ok: true };
  }

  async myCourses(u: AuthUser, status?: string) {
    const rows = await this.prisma.courseEnrollment.findMany({
      where: { studentId: u.id, ...(status === 'COMPLETED' ? { status: 'COMPLETED' as const } : {}) },
      orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
      select: {
        status: true, progressPercent: true, lessonsCompleted: true, lastActivityAt: true, completedAt: true,
        lastLesson: { select: { id: true, title: true, order: true } },
        course: {
          select: {
            id: true, slug: true, title: true, shortDescription: true, thumbnailUrl: true, accent: true,
            issuesCertificate: true,
            subject: { select: { name: true, accent: true } },
            grade: { select: { name: true } },
            teacher: { select: { name: true } },
            _count: { select: { lessons: { where: { status: 'PUBLISHED' } } } },
          },
        },
      },
    });
    const list = rows.map((e) => ({
      id: e.course.id, slug: e.course.slug, title: e.course.title,
      shortDescription: e.course.shortDescription, thumbnailUrl: e.course.thumbnailUrl,
      subject: e.course.subject?.name ?? 'General', subjectAccent: e.course.subject?.accent ?? e.course.accent,
      grade: e.course.grade?.name ?? null, teacher: e.course.teacher?.name ?? null,
      progressPercent: e.progressPercent, lessonsCompleted: e.lessonsCompleted,
      totalLessons: e.course._count.lessons, issuesCertificate: e.course.issuesCertificate,
      currentLesson: e.lastLesson, lastActivityAt: e.lastActivityAt, completedAt: e.completedAt,
      status: e.status === 'COMPLETED' ? 'COMPLETED' : e.lessonsCompleted > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    }));
    return status && status !== 'COMPLETED' ? list.filter((c) => c.status === status) : list;
  }

  /* --------------------------------------------------------- course detail */

  /**
   * The student's course page: the curriculum with per-lesson completion and
   * lock state, plus what is left before the course counts as finished.
   */
  async courseDetail(u: AuthUser, courseId: string) {
    const decision = await this.accessDecision(u, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        id: true, slug: true, title: true, shortDescription: true, description: true, thumbnailUrl: true,
        bannerUrl: true, trailerUrl: true, accent: true, difficulty: true, access: true, language: true,
        ageBand: true, estimatedMinutes: true, learningPoints: true, requirements: true, tags: true,
        issuesCertificate: true, passingScore: true, publishedAt: true,
        requireAllLessons: true, requireAllQuizzes: true, requireAllAssignments: true, requireFinalExam: true,
        subject: { select: { id: true, name: true, accent: true } },
        grade: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true } },
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, description: true, order: true,
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, description: true, type: true, order: true, estimatedMin: true,
                isRequired: true, objectives: true,
                quiz: { select: { id: true, title: true, published: true, passingScore: true } },
                assignments: { where: { status: { not: 'DRAFT' } }, select: { id: true, title: true, dueAt: true, maxScore: true } },
                progress: { where: { userId: u.id }, select: { completed: true, percent: true, completedAt: true } },
              },
            },
          },
        },
        exams: {
          where: { status: { not: 'DRAFT' } },
          select: {
            id: true, title: true, durationMin: true, passingScore: true, scheduledAt: true,
            availableFrom: true, availableUntil: true, status: true,
            quiz: {
              select: {
                id: true,
                _count: { select: { questions: true } },
                attempts: { where: { studentId: u.id }, orderBy: { percent: 'desc' }, take: 1, select: { percent: true, passed: true } },
              },
            },
          },
        },
        enrollments: { where: { studentId: u.id }, select: { status: true, progressPercent: true, lessonsCompleted: true, completedAt: true, lastLessonId: true } },
        certificates: { where: { userId: u.id, revoked: false }, select: { id: true, code: true, issuedAt: true, score: true } },
      },
    });

    const enrollment = course.enrollments[0] ?? null;
    // The curriculum is always listed — a student deciding whether to enrol
    // should see what is inside. Lesson bodies stay behind enrolment.
    const sections = course.sections.map((s) => ({
      id: s.id, title: s.title, description: s.description, order: s.order,
      lessons: s.lessons.map((l) => ({
        id: l.id, title: l.title, description: l.description, type: l.type, order: l.order,
        estimatedMin: l.estimatedMin, isRequired: l.isRequired, objectives: l.objectives,
        completed: l.progress[0]?.completed ?? false,
        percent: l.progress[0]?.percent ?? 0,
        completedAt: l.progress[0]?.completedAt ?? null,
        locked: !enrollment,
        quiz: l.quiz?.published ? { id: l.quiz.id, title: l.quiz.title, passingScore: l.quiz.passingScore } : null,
        assignments: l.assignments,
      })),
    }));

    const state = enrollment ? await this.completion.evaluate(u.id, courseId) : null;
    const exam = course.exams[0] ?? null;

    return {
      ...course,
      sections,
      exam: exam
        ? {
            id: exam.id, title: exam.title, durationMin: exam.durationMin, passingScore: exam.passingScore,
            scheduledAt: exam.scheduledAt, availableFrom: exam.availableFrom, availableUntil: exam.availableUntil,
            status: exam.status, quizId: exam.quiz.id, questionCount: exam.quiz._count.questions,
            result: exam.quiz.attempts[0] ?? null,
          }
        : null,
      exams: undefined,
      enrollments: undefined,
      totals: {
        modules: sections.length,
        lessons: sections.reduce((a, s) => a + s.lessons.length, 0),
        estimatedMinutes: course.estimatedMinutes ?? sections.reduce((a, s) => a + s.lessons.reduce((x, l) => x + l.estimatedMin, 0), 0),
      },
      // Named apart from `course.access`, which the spread above carries as the
      // FREE/PREMIUM/SCHOOL_ONLY enum — one must not shadow the other.
      accessDecision: decision,
      enrolled: Boolean(enrollment),
      enrollment,
      completion: state,
      certificate: course.certificates[0] ?? null,
    };
  }

  /* ---------------------------------------------------------- the player */

  /** Everything the learning page needs for one lesson, in one request. */
  async player(u: AuthUser, courseId: string, lessonId: string) {
    await this.assertEnrolled(u, courseId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true, courseId: true, sectionId: true, title: true, description: true, type: true,
        order: true, estimatedMin: true, objectives: true, videoUrl: true, status: true,
        contents: { orderBy: { order: 'asc' } },
        resources: { select: { id: true, name: true, url: true, kind: true, sizeBytes: true, description: true } },
        quiz: {
          where: { published: true },
          select: {
            id: true, title: true, passingScore: true, maxAttempts: true, timeLimitSec: true,
            _count: { select: { questions: true } },
            attempts: { where: { studentId: u.id }, orderBy: { attemptNo: 'desc' }, select: { id: true, status: true, percent: true, passed: true, attemptNo: true } },
          },
        },
        assignments: {
          where: { status: { not: 'DRAFT' } },
          select: {
            id: true, title: true, instructions: true, dueAt: true, maxScore: true, rubric: true,
            submissionType: true, allowedFileTypes: true, allowResubmit: true,
            submissions: { where: { studentId: u.id }, select: { id: true, status: true, score: true, feedback: true, submittedAt: true } },
          },
        },
        progress: { where: { userId: u.id }, select: { completed: true, percent: true, timeSpentSec: true, completedAt: true } },
      },
    });
    if (!lesson || lesson.courseId !== courseId) throw new NotFoundException('Lesson not found in this course.');
    if (lesson.status !== 'PUBLISHED') throw new NotFoundException('Lesson not found in this course.');

    // The curriculum rail, and the previous/next targets, come from the same
    // ordered walk so the two can never point at different lessons.
    const ordered = await this.orderedLessons(courseId, u.id);
    const index = ordered.findIndex((l) => l.id === lessonId);

    return {
      lesson: { ...lesson, progress: lesson.progress[0] ?? null },
      curriculum: ordered,
      nav: {
        index,
        total: ordered.length,
        previous: index > 0 ? ordered[index - 1] : null,
        next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
      },
      completion: await this.completion.evaluate(u.id, courseId),
    };
  }

  /** Autosaved as the student reads. Never marks a lesson complete on its own. */
  async saveProgress(u: AuthUser, lessonId: string, dto: LessonProgressDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    await this.assertEnrolled(u, lesson.courseId);

    const existing = await this.prisma.progress.findUnique({
      where: { userId_lessonId: { userId: u.id, lessonId } }, select: { percent: true },
    });
    // Progress only moves forward. Re-opening a lesson replays the player from
    // the top, and that must not reset a bar the student already pushed to 90%.
    const percent = Math.max(existing?.percent ?? 0, dto.percent ?? 0);

    const [row] = await this.prisma.$transaction([
      this.prisma.progress.upsert({
        where: { userId_lessonId: { userId: u.id, lessonId } },
        create: { userId: u.id, lessonId, percent, timeSpentSec: dto.timeSpentSec ?? 0 },
        update: { percent, ...(dto.timeSpentSec ? { timeSpentSec: { increment: dto.timeSpentSec } } : {}) },
      }),
      this.prisma.courseEnrollment.updateMany({
        where: { courseId: lesson.courseId, studentId: u.id },
        data: { lastLessonId: lessonId, lastActivityAt: new Date() },
      }),
    ]);
    return row;
  }

  /** Marks the lesson complete and runs the existing reward pipeline. Idempotent. */
  async completeLesson(u: AuthUser, lessonId: string, timeSpentSec = 0) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId }, select: { courseId: true, status: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    if (lesson.status !== 'PUBLISHED') throw new BadRequestException('That lesson is not published.');
    await this.assertEnrolled(u, lesson.courseId);

    const rewards = await this.rewards.onLessonCompleted(u.id, lessonId, timeSpentSec);
    const state = await this.completion.evaluate(u.id, lesson.courseId);
    const certificate = state.complete
      ? await this.prisma.certificate.findFirst({
          where: { userId: u.id, courseId: lesson.courseId, revoked: false },
          select: { id: true, code: true, issuedAt: true },
        })
      : null;
    return { rewards, completion: state, certificate };
  }

  /** Where the student is in a course — used by the progress bar and the parent view. */
  async courseProgress(u: AuthUser, courseId: string) {
    await this.assertEnrolled(u, courseId);
    const [state, enrollment] = await Promise.all([
      this.completion.evaluate(u.id, courseId),
      this.prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: u.id } },
        select: { status: true, enrolledAt: true, completedAt: true, lastActivityAt: true, lastLesson: { select: { id: true, title: true } } },
      }),
    ]);
    return { ...state, enrollment };
  }

  /* --------------------------------------------------------------- helpers */

  private async assertEnrolled(u: AuthUser, courseId: string) {
    const e = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: u.id } }, select: { id: true },
    });
    if (!e) throw new ForbiddenException('Enrol in this course first.');
  }

  private async firstLesson(courseId: string) {
    return this.prisma.lesson.findFirst({
      where: { courseId, status: 'PUBLISHED' },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true },
    });
  }

  private async orderedLessons(courseId: string, studentId: string) {
    const sections = await this.prisma.section.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: {
        id: true, title: true, order: true,
        lessons: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, type: true, order: true, estimatedMin: true, isRequired: true,
            progress: { where: { userId: studentId }, select: { completed: true, percent: true } },
          },
        },
      },
    });
    return sections.flatMap((s) =>
      s.lessons.map((l) => ({
        id: l.id, title: l.title, type: l.type, estimatedMin: l.estimatedMin, isRequired: l.isRequired,
        sectionId: s.id, sectionTitle: s.title,
        completed: l.progress[0]?.completed ?? false,
        percent: l.progress[0]?.percent ?? 0,
      })),
    );
  }
}
