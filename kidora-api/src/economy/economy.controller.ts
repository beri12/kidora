import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EconomyController {
  constructor(private economy: EconomyService) {}

  @Get('rewards') wallet(@CurrentUser() u: AuthUser) { return this.economy.wallet(u.id); }
  @Get('rewards/transactions') txns(@CurrentUser() u: AuthUser) { return this.economy.transactions(u.id); }
  @Post('rewards/purchase') purchase(@CurrentUser() u: AuthUser, @Body('itemId') itemId: string) { return this.economy.purchase(u.id, itemId); }
  @Get('missions') missions(@CurrentUser() u: AuthUser) { return this.economy.missions(u.id); }
  @Post('missions/:id/complete') complete(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.economy.completeMission(u.id, id); }
  @Get('achievements') achievements(@CurrentUser() u: AuthUser) { return this.economy.achievements(u.id); }
}
