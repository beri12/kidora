import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TeacherService } from './teacher.service';

@ApiTags('teacher') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...TEACHER_ROLES)
@Controller('teacher')
export class TeacherController {
  constructor(private svc: TeacherService) {}
  @Get('dashboard') dashboard(@CurrentUser() u: AuthUser, @Query('range') range?: string) { return this.svc.dashboard(u, range); }
  @Get('classes') classes(@CurrentUser() u: AuthUser) { return this.svc.classes(u); }
  @Get('classes/:id') classDetail(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.classDetail(u, id); }
  @Get('students') students(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('classId') classId?: string) { return this.svc.students(u, { ...q, classId }); }
  @Get('courses') courses(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.svc.courses(u, status); }
  @Get('tasks') tasks(@CurrentUser() u: AuthUser, @Query('bucket') bucket?: string) { return this.svc.tasks(u, bucket); }
  @Get('activity') activity(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) { return this.svc.activity(u, q); }
  @Get('assignments') assignments(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('classId') classId?: string, @Query('status') status?: string) { return this.svc.assignments(u, { ...q, classId, status }); }
  @Get('gradebook') gradebook(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('classId') classId?: string, @Query('courseId') courseId?: string) { return this.svc.gradebook(u, { ...q, classId, courseId }); }
  @Get('analytics') analytics(@CurrentUser() u: AuthUser, @Query('classId') classId?: string, @Query('courseId') courseId?: string, @Query('from') from?: string, @Query('to') to?: string) { return this.svc.analyticsView(u, { classId, courseId, from, to }); }
}
