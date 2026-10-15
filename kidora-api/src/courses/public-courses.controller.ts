import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { LearningService } from '../lms/learning/learning.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('courses')
@Controller('courses')
export class PublicCoursesController {
  constructor(private readonly coursesService: CoursesService, private readonly learning: LearningService) {}

  @Get()
  listPublished() {
    return this.coursesService.listPublished();
  }

  // Enrollment routes sit above :id so "enrollments" is never read as an id.

  /**
   * Self-enrolment in a published course. This is what puts a course on the
   * student's dashboard; before it existed, CourseEnrollment was never
   * written and every student dashboard was empty regardless of what
   * teachers published.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/enroll')
  enroll(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    // Same access rules as /learning/courses/:id/enroll. This route used to
    // create the row directly, and an enrolment is what grants access — so
    // it let anyone into premium, invite-only and other schools' courses.
    return this.learning.enroll({ id: u.id, role: u.role, schoolId: u.schoolId ?? null }, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/enroll')
  unenroll(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.coursesService.unenroll(u.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/enrollment')
  enrollment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.coursesService.enrollment(u.id, id);
  }

  @Get(':id')
  getPublished(@Param('id') id: string) {
    return this.coursesService.getPublished(id);
  }
}
