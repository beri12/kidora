import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { QuestsService } from './quests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';

@ApiTags('quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SchoolAccessGuard)
@Controller()
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get('learn/worlds')
  worlds(@Tenant() t: TenantContext) {
    return this.quests.worlds(t);
  }

  @Get('learn/worlds/:slug')
  world(@Tenant() t: TenantContext, @Param('slug') slug: string) {
    return this.quests.world(t, slug);
  }

  @Get('quests/me')
  mine(@Tenant() t: TenantContext) {
    return this.quests.mine(t);
  }

  @Get('quests/today')
  today(@Tenant() t: TenantContext) {
    return this.quests.today(t);
  }

  @Post('quests/:id/start')
  start(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.quests.start(t, id);
  }

  @Post('quests/:id/complete')
  complete(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.quests.complete(t, id);
  }
}
