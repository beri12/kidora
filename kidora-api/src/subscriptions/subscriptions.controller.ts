import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PlanKey } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get() mine(@CurrentUser() u: AuthUser) { return this.subs.mine(u.id); }
  @Get('usage') usage(@CurrentUser() u: AuthUser) { return this.subs.usage(u.id); }
  @Post() setPlan(@CurrentUser() u: AuthUser, @Body('plan') plan: PlanKey) { return this.subs.setPlan(u.id, plan); }
  @Post('cancel') cancel(@CurrentUser() u: AuthUser) { return this.subs.cancel(u.id); }
}
