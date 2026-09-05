import { Body, Controller, Get, Ip, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, SCHOOL_ADMIN_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SchoolService } from './school.service';
import { CreateClassDto, CreateStudentDto, CreateTeacherDto, ReviewCourseDto } from './dto';

@ApiTags('school') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...SCHOOL_ADMIN_ROLES)
@Controller('school')
export class SchoolController {
  constructor(private svc: SchoolService) {}
  @Get('dashboard') dashboard(@CurrentUser() u: AuthUser, @Query('range') range?: string) { return this.svc.dashboard(u, range); }
  @Get('students') students(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('gradeId') gradeId?: string, @Query('classId') classId?: string, @Query('status') status?: string) { return this.svc.students(u, { ...q, gradeId, classId, status }); }
  @Post('students') createStudent(@CurrentUser() u: AuthUser, @Body() dto: CreateStudentDto, @Ip() ip: string) { return this.svc.createStudent(u, dto, ip); }
  @Get('teachers') teachers(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) { return this.svc.teachers(u, q); }
  @Post('teachers') createTeacher(@CurrentUser() u: AuthUser, @Body() dto: CreateTeacherDto, @Ip() ip: string) { return this.svc.createTeacher(u, dto, ip); }
  @Get('classes') classes(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('gradeId') gradeId?: string) { return this.svc.classes(u, { ...q, gradeId }); }
  @Post('classes') createClass(@CurrentUser() u: AuthUser, @Body() dto: CreateClassDto, @Ip() ip: string) { return this.svc.createClass(u, dto, ip); }
  @Get('courses') courses(@CurrentUser() u: AuthUser, @Query() q: PaginationDto, @Query('status') status?: string, @Query('subjectId') subjectId?: string, @Query('gradeId') gradeId?: string) { return this.svc.courses(u, { ...q, status, subjectId, gradeId }); }
  @Patch('courses/:id/review') review(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ReviewCourseDto, @Ip() ip: string) { return this.svc.approveCourse(u, id, dto.approve, dto.note, ip); }
  @Get('analytics') analytics(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string) { return this.svc.analyticsView(u, { from, to }); }
  @Get('billing') billing(@CurrentUser() u: AuthUser) { return this.svc.billing(u); }
}
