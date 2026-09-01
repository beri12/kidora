import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CoursesService } from './courses.service';
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
  CatalogQueryDto,
  CreateCourseDto,
  CreateSectionDto,
  ReorderDto,
  UpdateCourseDto,
} from './dto/builder.dto';

const STAFF = [
  AppRole.TEACHER,
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.DISTRICT_ADMIN,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
] as const;

/**
 * LMS course routes. Registered *before* PublicCoursesController in the module
 * so the literal paths here (`catalog`, `library`) are matched ahead of `:id`.
 *
 * The existing wizard routes (`/courses/draft`, `/courses/:id/curriculum`,
 * `/courses/:id/publish`, `/courses/mine`, `/courses/upload/*`) still live in
 * CoursesController and are unchanged.
 */
@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SchoolAccessGuard)
@Controller('courses')
export class LmsCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly builder: CourseBuilderService,
  ) {}

  // ---- literal paths first ----

  /** Student catalog, filtered to what this learner may actually open. */
  @Get('catalog')
  catalog(@Tenant() tenant: TenantContext, @Query() query: CatalogQueryDto) {
    return this.courses.catalog(tenant, query);
  }

  /** Staff library for the caller's own school. */
  @Get('library')
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_READ)
  library(@Tenant() tenant: TenantContext, @Query() query: CatalogQueryDto) {
    return this.courses.listForStaff(tenant, query);
  }

  @Post()
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_CREATE)
  create(@Tenant() tenant: TenantContext, @Body() dto: CreateCourseDto) {
    return this.courses.create(tenant, dto);
  }

  // ---- :id paths ----

  /** Full editable tree for the course builder. */
  @Get(':id/builder')
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_UPDATE)
  tree(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.builder.tree(tenant, id);
  }

  /** Full learning tree for a student, with their completion state. */
  @Get(':id/learn')
  learn(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.courses.learnerView(tenant, id);
  }

  @Patch(':id')
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_UPDATE)
  update(@Tenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.updateCourse(tenant, id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_UPDATE)
  remove(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.courses.remove(tenant, id);
  }

  @Post(':id/unpublish')
  @Roles(...STAFF)
  @RequirePermissions(Permission.COURSES_PUBLISH)
  unpublish(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.courses.setPublished(tenant, id, false);
  }

  @Post(':id/enroll')
  enroll(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.courses.enroll(tenant, id);
  }

  @Post(':id/enroll/:studentId')
  @Roles(...STAFF)
  @RequirePermissions(Permission.STUDENTS_MANAGE)
  enrollStudent(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.courses.enrollStudent(tenant, id, studentId);
  }

  // ---- sections ----

  @Post(':id/sections')
  @Roles(...STAFF)
  @RequirePermissions(Permission.LESSONS_CREATE)
  addSection(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.builder.addSection(tenant, id, dto);
  }

  @Patch(':id/sections/order')
  @Roles(...STAFF)
  @RequirePermissions(Permission.LESSONS_UPDATE)
  reorderSections(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: ReorderDto,
  ) {
    return this.builder.reorderSections(tenant, id, dto);
  }
}
