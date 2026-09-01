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

import { SchoolsService } from './schools.service';
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
  AddClassStudentsDto,
  AssignStudentGradeDto,
  CreateClassDto,
  CreateGradeDto,
  ListQueryDto,
  UpdateClassDto,
  UpdateSchoolDto,
} from './dto/school.dto';

/**
 * Everything here is scoped to the *caller's own* school, resolved server-side
 * by SchoolAccessGuard. There is deliberately no `/schools/:id` route: a school
 * is never addressable by an id supplied by the client.
 */
@ApiTags('schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SchoolAccessGuard)
@Roles(
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.DISTRICT_ADMIN,
  AppRole.TEACHER,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
)
@Controller('schools/me')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  @RequirePermissions(Permission.SCHOOL_READ)
  me(@Tenant() tenant: TenantContext) {
    return this.schools.me(tenant);
  }

  @Patch()
  @RequirePermissions(Permission.SCHOOL_MANAGE)
  update(@Tenant() tenant: TenantContext, @Body() dto: UpdateSchoolDto) {
    return this.schools.update(tenant, dto);
  }

  @Get('dashboard')
  @RequirePermissions(Permission.ANALYTICS_READ)
  dashboard(@Tenant() tenant: TenantContext) {
    return this.schools.dashboard(tenant);
  }

  @Get('students')
  @RequirePermissions(Permission.STUDENTS_READ)
  students(@Tenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.schools.students(tenant, query);
  }

  @Patch('students/:id/grade')
  @RequirePermissions(Permission.STUDENTS_MANAGE)
  setGrade(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: AssignStudentGradeDto,
  ) {
    return this.schools.setStudentGrade(tenant, id, dto.gradeId);
  }

  @Get('teachers')
  @RequirePermissions(Permission.TEACHERS_READ)
  teachers(@Tenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.schools.teachers(tenant, query);
  }

  @Get('grades')
  @RequirePermissions(Permission.CLASSES_READ)
  grades(@Tenant() tenant: TenantContext) {
    return this.schools.grades(tenant);
  }

  @Post('grades')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  createGrade(@Tenant() tenant: TenantContext, @Body() dto: CreateGradeDto) {
    return this.schools.createGrade(tenant, dto);
  }

  @Delete('grades/:id')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  deleteGrade(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.schools.deleteGrade(tenant, id);
  }

  @Get('classes')
  @RequirePermissions(Permission.CLASSES_READ)
  classes(@Tenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.schools.classes(tenant, query);
  }

  @Post('classes')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  createClass(@Tenant() tenant: TenantContext, @Body() dto: CreateClassDto) {
    return this.schools.createClass(tenant, dto);
  }

  @Patch('classes/:id')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  updateClass(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.schools.updateClass(tenant, id, dto);
  }

  @Get('classes/:id/students')
  @RequirePermissions(Permission.STUDENTS_READ)
  roster(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.schools.classRoster(tenant, id);
  }

  @Post('classes/:id/students')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  addStudents(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: AddClassStudentsDto,
  ) {
    return this.schools.addStudents(tenant, id, dto);
  }

  @Delete('classes/:id/students/:studentId')
  @RequirePermissions(Permission.CLASSES_MANAGE)
  removeStudent(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.schools.removeStudent(tenant, id, studentId);
  }

  @Get('courses')
  @RequirePermissions(Permission.COURSES_READ)
  courses(
    @Tenant() tenant: TenantContext,
    @Query() query: ListQueryDto & { status?: string; teacherId?: string },
  ) {
    return this.schools.courses(tenant, query);
  }
}
