import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CourseBuilderService } from './course-builder.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AppRole } from '../common/enums/role.enum';
import { Permission } from '../common/enums/permission.enum';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';
import {
  CreateActivityDto,
  CreateLessonDto,
  ReorderDto,
  SubmitActivityDto,
  UpdateActivityDto,
  UpdateLessonDto,
  UpdateSectionDto,
} from './dto/builder.dto';

const STAFF = [
  AppRole.TEACHER,
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.DISTRICT_ADMIN,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
] as const;

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SchoolAccessGuard)
@Controller()
export class BuilderController {
  constructor(private readonly builder: CourseBuilderService) {}

  // ---- sections ----

  @Patch('sections/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_UPDATE)
  updateSection(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.builder.updateSection(t, id, dto);
  }

  @Delete('sections/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_UPDATE)
  deleteSection(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.builder.deleteSection(t, id);
  }

  @Post('sections/:id/lessons')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_CREATE)
  addLesson(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.builder.addLesson(t, id, dto);
  }

  @Patch('sections/:id/lessons/order')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_UPDATE)
  reorderLessons(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: ReorderDto) {
    return this.builder.reorderLessons(t, id, dto);
  }

  // ---- lessons ----
  // NOTE: LessonsController already owns GET /lessons/:id and POST /lessons.
  // Only the new verbs live here, so the existing routes keep their behaviour.

  @Patch('lessons/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_UPDATE)
  updateLesson(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.builder.updateLesson(t, id, dto);
  }

  @Delete('lessons/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.LESSONS_UPDATE)
  deleteLesson(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.builder.deleteLesson(t, id);
  }

  @Post('lessons/:id/activities')
  @Roles(...STAFF) @RequirePermissions(Permission.ACTIVITIES_CREATE)
  addActivity(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.builder.addActivity(t, id, dto);
  }

  // ---- activities ----

  /** Student-facing read. The answer key is stripped server-side. */
  @Get('activities/:id')
  activity(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.builder.activityForStudent(t, id);
  }

  /** Submit a response. The score is computed here, never accepted from the client. */
  @Post('activities/:id/submit')
  submitActivity(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: SubmitActivityDto,
  ) {
    return this.builder.submitActivity(t, id, dto);
  }

  @Patch('activities/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.ACTIVITIES_CREATE)
  updateActivity(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.builder.updateActivity(t, id, dto);
  }

  @Delete('activities/:id')
  @Roles(...STAFF) @RequirePermissions(Permission.ACTIVITIES_CREATE)
  deleteActivity(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.builder.deleteActivity(t, id);
  }
}
