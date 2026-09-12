import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AiClient } from './ai.client';
import type { ClassContextPayload, StudentContext, TutorResponsePayload } from './ai.types';
import { AnalyseClassDto, LessonPlanDto, QuizDraftDto, TutorChatDto } from './dto/ai.dto';

/**
 * Owns authorization and learner context for AI requests.
 *
 * The Python service is deliberately incapable of looking a student up. This
 * class decides whose data may be used, assembles the context, and only then
 * calls out — so an id in a request body can never widen what a caller sees.
 */
@Injectable()
export class AiService {
  constructor(private prisma: PrismaService, private client: AiClient) {}

  /**
   * Resolve which student a caller may ask about.
   * A child asks about themselves; a parent about a linked child only.
   */
  private async resolveStudentId(u: AuthUser, requested?: string): Promise<string> {
    if (u.role === 'CHILD') {
      if (requested && requested !== u.id) {
        throw new ForbiddenException('You can only ask about your own learning.');
      }
      return u.id;
    }

    if (u.role === 'PARENT') {
      if (!requested) throw new ForbiddenException('Choose which child this is about.');
      const link = await this.prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: u.id, studentId: requested } },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('That student is not linked to your account.');
      return requested;
    }

    if (u.role === 'TEACHER') {
      if (!requested) throw new ForbiddenException('Choose which student this is about.');
      const shared = await this.prisma.classEnrollment.count({
        where: { studentId: requested, class: { teachers: { some: { teacherId: u.id } } } },
      });
      if (!shared) throw new ForbiddenException('That student is not in your classes.');
      return requested;
    }

    throw new ForbiddenException('Your role cannot use the AI tutor.');
  }

  /**
   * Assemble what the tutor is told. Mastery is a running estimate from quiz
   * performance until the Phase 4 knowledge-tracing model replaces it.
   */
  private async buildContext(studentId: string, dto: TutorChatDto): Promise<StudentContext> {
    const [student, course, lesson] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { grade: { select: { name: true } } },
      }),
      dto.courseId
        ? this.prisma.course.findUnique({
            where: { id: dto.courseId },
            select: { id: true, title: true, subject: { select: { name: true } } },
          })
        : null,
      dto.lessonId
        ? this.prisma.lesson.findUnique({ where: { id: dto.lessonId }, select: { id: true, title: true } })
        : null,
    ]);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'GRADED'] } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      select: { percent: true, quiz: { select: { title: true } }, passed: true },
    });

    // Mean of recent scores, defaulting to the middle band for a new learner
    // so the tutor neither over- nor under-scaffolds on no evidence.
    const mastery = attempts.length
      ? Math.min(1, Math.max(0, attempts.reduce((sum, a) => sum + a.percent, 0) / attempts.length / 100))
      : 0.5;

    return {
      student_id: studentId,
      grade: student?.grade?.name ?? null,
      subject: course?.subject?.name ?? null,
      course_id: course?.id ?? null,
      course_title: course?.title ?? null,
      lesson_id: lesson?.id ?? null,
      lesson_title: lesson?.title ?? null,
      mastery,
      recent_mistakes: attempts.filter((a) => !a.passed).slice(0, 5).map((a) => a.quiz.title),
    };
  }

  async tutorChat(u: AuthUser, dto: TutorChatDto, studentId?: string): Promise<TutorResponsePayload> {
    const target = await this.resolveStudentId(u, studentId);
    const context = await this.buildContext(target, dto);

    const reply = await this.client.tutorChat({
      message: dto.message,
      context,
      history: dto.history ?? [],
    });

    // Record the exchange against the learner, as the LMS already does for its
    // own tutor, so Phase 4 has learning events to train on.
    await this.prisma.aIConversation.create({
      data: {
        userId: target,
        message: dto.message,
        response: reply.message,
        kind: 'TUTOR',
        lessonId: dto.lessonId ?? null,
        courseId: dto.courseId ?? null,
      },
    }).catch(() => undefined); // never fail a child's answer over analytics

    return reply;
  }

  health() {
    return this.client.health();
  }
  /* ------------------------------------------- teaching aids (teachers only) */

  private assertTeacher(u: AuthUser) {
    const allowed = ['TEACHER', 'SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowed.includes(u.role)) {
      throw new ForbiddenException('Only teachers can use the teaching assistant.');
    }
  }

  /**
   * Draft a lesson plan. Returned for the teacher to read and edit — there is
   * deliberately no route that writes this into a course, so nothing generated
   * here can reach a student without a teacher saving it themselves.
   */
  async lessonPlan(u: AuthUser, dto: LessonPlanDto) {
    this.assertTeacher(u);
    return this.client.lessonPlan({
      subject: dto.subject,
      grade: dto.grade,
      topic: dto.topic,
      objectives: dto.objectives ?? [],
      difficulty: dto.difficulty ?? 'MEDIUM',
      duration_min: dto.durationMin ?? 30,
      language: dto.language ?? 'English',
      notes: dto.notes ?? null,
    });
  }

  /** Draft quiz questions for the teacher to review before adding them. */
  async quizDraft(u: AuthUser, dto: QuizDraftDto) {
    this.assertTeacher(u);
    return this.client.quizDraft({
      subject: dto.subject,
      grade: dto.grade,
      topic: dto.topic,
      question_count: dto.questionCount ?? 5,
      difficulty: dto.difficulty ?? 'MEDIUM',
      question_types: dto.questionTypes?.length ? dto.questionTypes : ['MULTIPLE_CHOICE'],
      language: dto.language ?? 'English',
    });
  }

  /**
   * Analyse a class the teacher actually teaches.
   *
   * Every figure is read here, from the database, after the ownership check.
   * Nothing numeric comes from the request body, so a teacher cannot ask the
   * model to reason about a class they have no access to, and cannot feed it
   * fabricated statistics.
   */
  async analyseClass(u: AuthUser, dto: AnalyseClassDto) {
    this.assertTeacher(u);
    if (!dto.classId && !dto.courseId) {
      throw new BadRequestException('Choose a class or a course to analyse.');
    }

    const context = dto.classId
      ? await this.classContext(u, dto.classId)
      : await this.courseContext(u, dto.courseId!);

    return this.client.analyseClass({ context, question: dto.question ?? null });
  }

  private async classContext(u: AuthUser, classId: string): Promise<ClassContextPayload> {
    const cls = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      select: {
        id: true, name: true, schoolId: true,
        grade: { select: { name: true } },
        teachers: { where: { teacherId: u.id }, select: { subject: { select: { name: true } } } },
        enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found.');
    const isAdmin = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(u.role);
    if (!cls.teachers.length && !(isAdmin && cls.schoolId === u.schoolId)) {
      throw new ForbiddenException('You do not teach this class.');
    }

    const studentIds = cls.enrollments.map((e) => e.studentId);
    const stats = await this.studentStats(studentIds);
    return {
      class_name: cls.name,
      course_title: null,
      subject: cls.teachers[0]?.subject?.name ?? null,
      grade: cls.grade?.name ?? null,
      ...stats,
    };
  }

  private async courseContext(u: AuthUser, courseId: string): Promise<ClassContextPayload> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, title: true, teacherId: true, schoolId: true,
        subject: { select: { name: true } },
        grade: { select: { name: true } },
        enrollments: { select: { studentId: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');
    const isAdmin = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(u.role);
    if (course.teacherId !== u.id && !(isAdmin && course.schoolId === u.schoolId)) {
      throw new ForbiddenException('You do not teach this course.');
    }

    const studentIds = course.enrollments.map((e) => e.studentId);
    const stats = await this.studentStats(studentIds, courseId);
    return {
      class_name: null,
      course_title: course.title,
      subject: course.subject?.name ?? null,
      grade: course.grade?.name ?? null,
      ...stats,
    };
  }

  /** Real progress and score figures for a set of students. */
  private async studentStats(studentIds: string[], courseId?: string) {
    if (studentIds.length === 0) {
      return {
        student_count: 0, average_score: null, completion_percent: null,
        topics: [], struggling: [], thriving: [],
      };
    }

    const [students, enrollments, attempts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, displayName: true },
      }),
      this.prisma.courseEnrollment.findMany({
        where: { studentId: { in: studentIds }, ...(courseId ? { courseId } : {}) },
        select: { studentId: true, progressPercent: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: {
          studentId: { in: studentIds },
          status: { in: ['SUBMITTED', 'GRADED'] },
          ...(courseId ? { OR: [{ quiz: { courseId } }, { quiz: { lesson: { courseId } } }] } : {}),
        },
        select: {
          studentId: true, percent: true, passed: true,
          quiz: { select: { title: true, lesson: { select: { title: true } } } },
        },
      }),
    ]);

    const progressOf = new Map<string, number[]>();
    for (const e of enrollments) {
      progressOf.set(e.studentId, [...(progressOf.get(e.studentId) ?? []), e.progressPercent]);
    }
    const scoresOf = new Map<string, number[]>();
    for (const a of attempts) {
      scoresOf.set(a.studentId, [...(scoresOf.get(a.studentId) ?? []), a.percent]);
    }
    const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((x, y) => x + y, 0) / xs.length) : 0);

    const rows = students.map((s) => {
      const progress = mean(progressOf.get(s.id) ?? []);
      const score = mean(scoresOf.get(s.id) ?? []);
      const seen = (scoresOf.get(s.id) ?? []).length > 0;
      return {
        // First name only: the model has no need for a child's full name.
        name: (s.displayName || s.name || 'Student').split(' ')[0],
        progress_percent: progress,
        average_score: score,
        health: !seen && progress < 20 ? 'AT_RISK' : score < 50 || progress < 30 ? 'NEEDS_SUPPORT' : 'ON_TRACK',
      };
    });

    // Topic mastery, grouped by the quiz (or its lesson) the attempt belongs to.
    const byTopic = new Map<string, { mastered: number; total: number }>();
    for (const a of attempts) {
      const topic = a.quiz.lesson?.title ?? a.quiz.title;
      const cur = byTopic.get(topic) ?? { mastered: 0, total: 0 };
      cur.total += 1;
      if (a.passed) cur.mastered += 1;
      byTopic.set(topic, cur);
    }

    const allScores = attempts.map((a) => a.percent);
    const allProgress = enrollments.map((e) => e.progressPercent);

    return {
      student_count: students.length,
      average_score: allScores.length ? mean(allScores) : null,
      completion_percent: allProgress.length ? mean(allProgress) : null,
      topics: [...byTopic.entries()]
        .map(([topic, v]) => ({
          topic, mastered: v.mastered, total: v.total,
          mastery_percent: v.total ? Math.round((v.mastered / v.total) * 100) : 0,
        }))
        .sort((a, b) => a.mastery_percent - b.mastery_percent)
        .slice(0, 12),
      struggling: rows.filter((r) => r.health !== 'ON_TRACK').sort((a, b) => a.average_score - b.average_score).slice(0, 10),
      thriving: rows.filter((r) => r.health === 'ON_TRACK').sort((a, b) => b.average_score - a.average_score).slice(0, 10),
    };
  }

}
