import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PlanKey } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class SetPlanDto {
  @ApiProperty({ enum: PlanKey }) @IsEnum(PlanKey, { message: 'This plan is currently unavailable.' })
  plan!: PlanKey;
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get() mine(@CurrentUser() u: AuthUser) { return this.subs.mine(u.id); }
  @Get('usage') usage(@CurrentUser() u: AuthUser) { return this.subs.usage(u.id); }
  @Post() setPlan(@CurrentUser() u: AuthUser, @Body() dto: SetPlanDto) { return this.subs.setPlan(u.id, dto.plan); }
  @Post('cancel') cancel(@CurrentUser() u: AuthUser) { return this.subs.cancel(u.id); }
}
