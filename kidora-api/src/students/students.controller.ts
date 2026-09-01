import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SchoolAccessGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  /** Student home screen payload: profile, wallet, in-progress, recommended. */
  @Get('me/home')
  home(@Tenant() t: TenantContext) {
    return this.students.home(t);
  }

  @Get('me/progress')
  progress(@Tenant() t: TenantContext) {
    return this.students.progress(t);
  }

  @Get('me/children')
  children(@Tenant() t: TenantContext) {
    return this.students.myChildren(t);
  }

  /** Parent report for one linked child. */
  @Get(':id/report')
  report(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.students.childReport(t, id);
  }
}
