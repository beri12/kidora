import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AiClient } from './ai.client';
import type { StudentContext, TutorResponsePayload } from './ai.types';
import { TutorChatDto } from './dto/ai.dto';

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
}
