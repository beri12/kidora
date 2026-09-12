import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, SCHOOL_ADMIN_ROLES, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { AuthoringService } from './authoring.service';
import { AssessmentAuthoringService } from './assessment-authoring.service';
import { PublishService } from './publish.service';
import {
  AssignmentDto, CompletionRulesDto, ContentBlockDto, CourseBasicsDto, ExamDto, LessonDto,
  QuizDto, ReorderDto, SaveContentDto, SectionDto, UpdateAssignmentDto, UpdateContentBlockDto,
  UpdateCourseDto, UpdateLessonDto, UpdateQuizDto, UpdateSectionDto,
} from './dto';

const AUTHORS = [...TEACHER_ROLES, ...SCHOOL_ADMIN_ROLES];

/**
 * Course authoring — everything a teacher does before a course reaches a
 * student. Every route re-checks authorship server-side; none of them trust a
 * course id from the browser.
 */
@ApiTags('course-authoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUTHORS)
@Controller('authoring')
export class AuthoringController {
  constructor(
    private readonly authoring: AuthoringService,
    private readonly assessments: AssessmentAuthoringService,
    private readonly publishing: PublishService,
  ) {}

  /* -------------------------------------------------------------- courses */

  @Post('courses')
  @ApiOperation({ summary: 'Create a draft course.' })
  createCourse(@CurrentUser() u: AuthUser, @Body() dto: CourseBasicsDto) {
    return this.authoring.createCourse(u, dto);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'The full course hierarchy for the wizard.' })
  courseTree(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.authoring.courseTree(u, courseId);
  }

  @Patch('courses/:courseId')
  @ApiOperation({ summary: 'Save a draft (any subset of fields).' })
  updateCourse(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: UpdateCourseDto) {
    return this.authoring.updateCourse(u, courseId, dto);
  }

  @Patch('courses/:courseId/completion')
  @ApiOperation({ summary: 'Configure what a student must finish to complete the course.' })
  completionRules(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: CompletionRulesDto) {
    return this.authoring.setCompletionRules(u, courseId, dto);
  }

  @Get('courses/:courseId/checklist')
  @ApiOperation({ summary: 'Publishing checklist — what is still missing.' })
  checklist(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.checklist(u, courseId);
  }

  @Get('courses/:courseId/preview')
  @ApiOperation({ summary: 'The course as a student would first see it.' })
  preview(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.preview(u, courseId);
  }

  @Post('courses/:courseId/publish')
  @ApiOperation({ summary: 'Publish, if the checklist passes.' })
  publish(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.publish(u, courseId);
  }

  @Post('courses/:courseId/unpublish')
  unpublish(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.unpublish(u, courseId);
  }

  @Post('courses/:courseId/archive')
  archive(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.archive(u, courseId);
  }

  @Post('courses/:courseId/submit-review')
  submitForReview(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.publishing.submitForReview(u, courseId);
  }

  /* ------------------------------------------------------------- sections */

  @Post('courses/:courseId/sections')
  createSection(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: SectionDto) {
    return this.authoring.createSection(u, courseId, dto);
  }

  @Patch('courses/:courseId/sections/reorder')
  @ApiOperation({ summary: 'Persist a drag-and-drop reorder.' })
  reorderSections(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: ReorderDto) {
    return this.authoring.reorderSections(u, courseId, dto);
  }

  @Patch('sections/:id')
  updateSection(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.authoring.updateSection(u, id, dto);
  }

  @Delete('sections/:id')
  deleteSection(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.deleteSection(u, id);
  }

  @Post('sections/:id/duplicate')
  duplicateSection(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.duplicateSection(u, id);
  }

  /* -------------------------------------------------------------- lessons */

  @Post('sections/:sectionId/lessons')
  createLesson(@CurrentUser() u: AuthUser, @Param('sectionId') sectionId: string, @Body() dto: LessonDto) {
    return this.authoring.createLesson(u, sectionId, dto);
  }

  @Patch('sections/:sectionId/lessons/reorder')
  reorderLessons(@CurrentUser() u: AuthUser, @Param('sectionId') sectionId: string, @Body() dto: ReorderDto) {
    return this.authoring.reorderLessons(u, sectionId, dto);
  }

  @Get('lessons/:id')
  getLesson(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.getLesson(u, id);
  }

  @Patch('lessons/:id')
  updateLesson(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.authoring.updateLesson(u, id, dto);
  }

  @Delete('lessons/:id')
  deleteLesson(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.deleteLesson(u, id);
  }

  @Post('lessons/:id/duplicate')
  duplicateLesson(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.duplicateLesson(u, id);
  }

  /* ------------------------------------------------------- lesson content */

  @Put('lessons/:id/content')
  @ApiOperation({ summary: 'Replace every content block on a lesson (autosave).' })
  saveContent(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SaveContentDto) {
    return this.authoring.saveContent(u, id, dto);
  }

  @Post('lessons/:id/content')
  addContent(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ContentBlockDto) {
    return this.authoring.addContent(u, id, dto);
  }

  @Patch('content/:id')
  updateContent(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateContentBlockDto) {
    return this.authoring.updateContent(u, id, dto);
  }

  @Delete('content/:id')
  deleteContent(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.authoring.deleteContent(u, id);
  }

  /* -------------------------------------------------------------- quizzes */

  @Get('courses/:courseId/quizzes')
  listQuizzes(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.assessments.listQuizzes(u, courseId);
  }

  @Post('courses/:courseId/quizzes')
  createQuiz(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: QuizDto) {
    return this.assessments.createQuiz(u, courseId, dto);
  }

  @Get('quizzes/:id')
  getQuiz(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.assessments.getQuiz(u, id);
  }

  @Patch('quizzes/:id')
  updateQuiz(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.assessments.updateQuiz(u, id, dto);
  }

  @Delete('quizzes/:id')
  deleteQuiz(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.assessments.deleteQuiz(u, id);
  }

  /* ---------------------------------------------------------- assignments */

  @Get('courses/:courseId/assignments')
  listAssignments(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.assessments.listAssignments(u, courseId);
  }

  @Post('courses/:courseId/assignments')
  createAssignment(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: AssignmentDto) {
    return this.assessments.createAssignment(u, courseId, dto);
  }

  @Get('assignments/:id')
  getAssignment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.assessments.getAssignment(u, id);
  }

  @Patch('assignments/:id')
  updateAssignment(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assessments.updateAssignment(u, id, dto);
  }

  @Patch('assignments/:id/status/:status')
  setAssignmentStatus(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('status') status: 'DRAFT' | 'PUBLISHED' | 'CLOSED',
  ) {
    return this.assessments.setAssignmentStatus(u, id, status);
  }

  @Delete('assignments/:id')
  deleteAssignment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.assessments.deleteAssignment(u, id);
  }

  /* ----------------------------------------------------------------- exam */

  @Get('courses/:courseId/exam')
  getExam(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.assessments.getExam(u, courseId);
  }

  @Put('courses/:courseId/exam')
  @ApiOperation({ summary: 'Create or replace the final exam.' })
  upsertExam(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string, @Body() dto: ExamDto) {
    return this.assessments.upsertExam(u, courseId, dto);
  }

  @Patch('courses/:courseId/exam/status/:status')
  setExamStatus(
    @CurrentUser() u: AuthUser,
    @Param('courseId') courseId: string,
    @Param('status') status: 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED',
  ) {
    return this.assessments.setExamStatus(u, courseId, status);
  }

  @Delete('courses/:courseId/exam')
  deleteExam(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.assessments.deleteExam(u, courseId);
  }
}
