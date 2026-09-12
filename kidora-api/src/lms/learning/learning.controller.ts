import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, STUDENT_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { LearningService } from './learning.service';
import { BrowseCoursesDto, LessonProgressDto } from './dto';

/**
 * The student's learning surface. Every route resolves the student from the
 * JWT — none of them take a student id, so one child cannot read another's
 * progress by editing a URL.
 */
@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STUDENT_ROLES)
@Controller('learning')
export class LearningController {
  constructor(private readonly svc: LearningService) {}

  @Get('browse')
  @ApiOperation({ summary: 'Published courses this student may open, filtered and paged.' })
  browse(@CurrentUser() u: AuthUser, @Query() q: BrowseCoursesDto) {
    return this.svc.browse(u, q);
  }

  @Get('browse/filters')
  @ApiOperation({ summary: 'The filter values the browse page offers.' })
  filters(@CurrentUser() u: AuthUser) {
    return this.svc.browseFilters(u);
  }

  @Get('my-courses')
  myCourses(@CurrentUser() u: AuthUser, @Query('status') status?: string) {
    return this.svc.myCourses(u, status);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Course landing page: curriculum, progress and what is left to finish.' })
  courseDetail(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.svc.courseDetail(u, courseId);
  }

  @Get('courses/:courseId/access')
  @ApiOperation({ summary: 'Whether this student may open the course, and why not.' })
  access(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.svc.accessDecision(u, courseId);
  }

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enrol. Idempotent.' })
  enroll(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.svc.enroll(u, courseId);
  }

  @Delete('courses/:courseId/enroll')
  unenroll(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.svc.unenroll(u, courseId);
  }

  @Get('courses/:courseId/progress')
  progress(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.svc.courseProgress(u, courseId);
  }

  @Get('courses/:courseId/lessons/:lessonId')
  @ApiOperation({ summary: 'Everything the learning player needs for one lesson.' })
  player(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Param('lessonId') lessonId: string) {
    return this.svc.player(u, courseId, lessonId);
  }

  @Post('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Autosave while reading. Percent never moves backwards.' })
  saveProgress(@CurrentUser() u: AuthUser, @Param('lessonId') lessonId: string, @Body() dto: LessonProgressDto) {
    return this.svc.saveProgress(u, lessonId, dto);
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark complete, award XP, and re-check course completion.' })
  complete(
    @CurrentUser() u: AuthUser,
    @Param('lessonId') lessonId: string,
    @Query('timeSpentSec') timeSpentSec?: string,
  ) {
    return this.svc.completeLesson(u, lessonId, Number(timeSpentSec ?? 0) || 0);
  }
}
