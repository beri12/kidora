import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';
import { TrackEventDto } from './dto/analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @UseGuards(RolesGuard) @Roles(AppRole.ADMIN) @Get('analytics/platform')
  platform() { return this.analytics.platform(); }

  @UseGuards(RolesGuard) @Roles(AppRole.PARENT, AppRole.CHILD, AppRole.ADMIN) @Get('reports/me')
  myReport(@CurrentUser() u: AuthUser) { return this.analytics.childReport(u.id); }

  @UseGuards(RolesGuard, SchoolAccessGuard)
  @Roles(AppRole.TEACHER, AppRole.ADMIN, AppRole.SUPER_ADMIN)
  @Get('analytics/teacher')
  teacher(@CurrentUser() u: AuthUser) { return this.analytics.teacherOverview(u.id); }

  @UseGuards(RolesGuard, SchoolAccessGuard)
  @Roles(AppRole.SCHOOL_ADMIN, AppRole.SCHOOL_LEADER, AppRole.DISTRICT_ADMIN, AppRole.ADMIN, AppRole.SUPER_ADMIN)
  @Get('analytics/school')
  school(@Tenant() t: TenantContext) {
    return this.analytics.schoolPerformance(t.schoolId ?? '__none__');
  }

  /**
   * Client-side learning telemetry. Only the event name and a small props bag
   * are accepted; the user and school are taken from the session, never the body.
   */
  @Post('analytics/events')
  track(@CurrentUser() u: AuthUser, @Body() dto: TrackEventDto) {
    return this.analytics
      .track(dto.name, { userId: u.id, courseId: dto.courseId, props: dto.props })
      .then(() => ({ ok: true }));
  }
}
