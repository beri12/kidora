import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';

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
}
