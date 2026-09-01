import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ExamsService } from './exams.service';
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
import { CreateExamDto, SubmitExamDto, UpdateExamDto } from './dto/exam.dto';

const STAFF = [
  AppRole.TEACHER,
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
] as const;

@ApiTags('exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SchoolAccessGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get('teaching')
  @Roles(...STAFF) @RequirePermissions(Permission.EXAMS_CREATE)
  teaching(@Tenant() t: TenantContext, @Query('courseId') courseId?: string) {
    return this.exams.listForTeacher(t, courseId);
  }

  @Post()
  @Roles(...STAFF) @RequirePermissions(Permission.EXAMS_CREATE)
  create(@Tenant() t: TenantContext, @Body() dto: CreateExamDto) {
    return this.exams.create(t, dto);
  }

  /** Student-safe overview: counts and attempt history, never the questions. */
  @Get(':id')
  overview(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.exams.overview(t, id);
  }

  @Patch(':id')
  @Roles(...STAFF) @RequirePermissions(Permission.EXAMS_CREATE)
  update(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.exams.update(t, id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF) @RequirePermissions(Permission.EXAMS_CREATE)
  remove(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.exams.remove(t, id);
  }

  @Post(':id/start')
  start(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.exams.start(t, id);
  }

  @Post(':id/submit')
  submit(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: SubmitExamDto) {
    return this.exams.submit(t, id, dto);
  }

  @Get(':id/result')
  result(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.exams.result(t, id);
  }

  @Get(':id/results')
  @Roles(...STAFF) @RequirePermissions(Permission.EXAMS_GRADE)
  results(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.exams.results(t, id);
  }
}
