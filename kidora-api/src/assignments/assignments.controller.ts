import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AssignmentsService } from './assignments.service';
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
  CreateAssignmentDto,
  GradeAssignmentDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

const STAFF = [
  AppRole.TEACHER,
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
] as const;

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SchoolAccessGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  /** Teacher view. */
  @Get('teaching')
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_CREATE)
  teaching(@Tenant() t: TenantContext, @Query('courseId') courseId?: string) {
    return this.assignments.listForTeacher(t, courseId);
  }

  /** Student view. */
  @Get('mine')
  mine(@Tenant() t: TenantContext, @Query('courseId') courseId?: string) {
    return this.assignments.listForStudent(t, courseId);
  }

  @Post()
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_CREATE)
  create(@Tenant() t: TenantContext, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(t, dto);
  }

  @Get(':id')
  one(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.assignments.one(t, id);
  }

  @Patch(':id')
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_CREATE)
  update(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.update(t, id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_CREATE)
  remove(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.assignments.remove(t, id);
  }

  @Post(':id/submit')
  submit(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: SubmitAssignmentDto) {
    return this.assignments.submit(t, id, dto);
  }

  @Get(':id/submissions')
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_GRADE)
  submissions(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.assignments.submissions(t, id);
  }

  /**
   * Grading targets the submission, not the assignment, so a teacher can never
   * accidentally grade the whole class in one call.
   */
  @Post('submissions/:submissionId/grade')
  @Roles(...STAFF) @RequirePermissions(Permission.ASSIGNMENTS_GRADE)
  grade(
    @Tenant() t: TenantContext,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeAssignmentDto,
  ) {
    return this.assignments.grade(t, submissionId, dto);
  }
}
