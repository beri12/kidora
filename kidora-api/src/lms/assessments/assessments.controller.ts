import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, SCHOOL_ADMIN_ROLES, STUDENT_ROLES, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QuizzesService } from './quizzes.service';
import { AssignmentsService } from './assignments.service';
import { ExamsService } from './exams.service';
import { CreateAssignmentDto, CreateExamDto, CreateQuizDto, GradeSubmissionDto, SubmitAssignmentDto, SubmitAttemptDto } from './dto';

const STAFF = [...TEACHER_ROLES, ...SCHOOL_ADMIN_ROLES];

@ApiTags('assessments') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssessmentsController {
  constructor(private prisma: PrismaService, private quizzes: QuizzesService, private assignments: AssignmentsService, private exams: ExamsService) {}

  // ---- student
  @Roles(...STUDENT_ROLES) @Get('lms/quizzes/:id') quiz(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.quizzes.getForStudent(u.id, id); }
  @Roles(...STUDENT_ROLES) @Post('lms/quizzes/:id/attempts') start(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.quizzes.startAttempt(u.id, id); }
  @Roles(...STUDENT_ROLES) @Post('lms/exams/:id/attempts') async startExam(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const x = await this.prisma.exam.findUniqueOrThrow({ where: { id }, select: { quizId: true } });
    return this.quizzes.startAttempt(u.id, x.quizId, id);
  }
  @Roles(...STUDENT_ROLES) @Post('lms/attempts/:id/submit') submit(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubmitAttemptDto) { return this.quizzes.submitAttempt(u.id, id, dto); }
  @Roles(...STUDENT_ROLES) @Post('student/assignments/:id/submit') submitAssignment(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubmitAssignmentDto) { return this.assignments.submit(u.id, id, dto); }

  // ---- teacher / school
  @Roles(...STAFF) @Post('teacher/quizzes') createQuiz(@CurrentUser() u: AuthUser, @Body() dto: CreateQuizDto) { return this.quizzes.create(u, dto); }
  @Roles(...STAFF) @Post('teacher/assignments') createAssignment(@CurrentUser() u: AuthUser, @Body() dto: CreateAssignmentDto) { return this.assignments.create(u, dto); }
  @Roles(...STAFF) @Patch('teacher/assignments/:id/publish') publish(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.assignments.publish(u, id); }
  @Roles(...STAFF) @Get('teacher/assignments/:id/submissions') submissions(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.assignments.submissions(u, id); }
  @Roles(...STAFF) @Patch('teacher/submissions/:id/grade') grade(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: GradeSubmissionDto) { return this.assignments.grade(u, id, dto); }
  @Roles(...STAFF) @Get('teacher/exams') listExams(@CurrentUser() u: AuthUser) { return this.exams.listForTeacher(u); }
  @Roles(...STAFF) @Post('teacher/exams') createExam(@CurrentUser() u: AuthUser, @Body() dto: CreateExamDto) { return this.exams.create(u, dto); }
  @Roles(...STAFF) @Patch('teacher/exams/:id/status/:status') examStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('status') status: 'SCHEDULED' | 'OPEN' | 'CLOSED') { return this.exams.setStatus(u, id, status); }
}
