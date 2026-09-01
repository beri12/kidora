import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums/role.enum';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';
import { CourseAccessService } from '../courses/course-access.service';
import { stripAnswerKey } from '../common/grading/question.grader';

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SchoolAccessGuard)
@Controller('lessons')
export class LessonsController {
  constructor(
    private prisma: PrismaService,
    private access: CourseAccessService,
  ) {}

  /**
   * SECURITY: this route used to be @Public() and returned
   * `quiz: { include: { questions: true } }`, which published every quiz's
   * `correct` index — and any unpublished course's content — to anyone with a
   * lesson id. It now requires a session, checks the caller may open the
   * course, and strips every answer key before responding.
   */
  @Get(':id')
  async one(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        resources: true,
        activities: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, instructions: true, type: true,
            order: true, points: true, config: true,
          },
        },
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        course: { select: { id: true, title: true, schoolId: true, published: true } },
        section: { select: { id: true, title: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.access.assertCanLearn(tenant, lesson.courseId);

    const progress = await this.prisma.progress.findUnique({
      where: { userId_lessonId: { userId: tenant.userId, lessonId: id } },
      select: { completed: true, percent: true },
    });

    return {
      ...lesson,
      // Activity configs keep only what the renderer needs.
      activities: lesson.activities.map((a) => ({ ...a, config: stripAnswerKey(a.config) ?? {} })),
      // The quiz is summarised here; the questions are served by /quizzes/:id,
      // which does its own stripping.
      quiz: lesson.quiz
        ? { id: lesson.quiz.id, title: lesson.quiz.title, passingScore: lesson.quiz.passingScore, questionCount: lesson.quiz.questions.length }
        : null,
      completed: progress?.completed ?? false,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(AppRole.TEACHER, AppRole.SCHOOL_ADMIN, AppRole.SCHOOL_LEADER, AppRole.ADMIN, AppRole.SUPER_ADMIN)
  @Post()
  async create(
    @Tenant() tenant: TenantContext,
    @Body() body: { courseId: string; title: string; type?: any; duration?: string; order?: number },
  ) {
    // The course is checked before the write, so a teacher cannot add a lesson
    // to another school's course by posting its id.
    await this.access.assertCanEdit(tenant, body.courseId);
    return this.prisma.lesson.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        type: body.type ?? 'VIDEO',
        duration: body.duration ?? '5 min',
        order: body.order ?? 0,
      },
    });
  }
}
