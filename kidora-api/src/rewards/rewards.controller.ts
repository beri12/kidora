import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('rewards')
@Controller()
export class RewardsController {
  constructor(private rewards: RewardsService) {}

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('badges/me')
  myBadges(@CurrentUser() u: AuthUser) { return this.rewards.badgesFor(u.id); }

  @Public() @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) { return this.rewards.leaderboard(limit ? Number(limit) : 10); }

  // Class-scoped, personal-best framed board used by the student game UI.
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('leaderboard/class')
  classBoard(@CurrentUser() u: AuthUser, @Query('limit') limit?: string) {
    return this.rewards.classLeaderboard(u.id, limit ? Number(limit) : 10);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('rewards/xp-history')
  xpHistory(@CurrentUser() u: AuthUser, @Query('limit') limit?: string) {
    return this.rewards.xpHistory(u.id, limit ? Math.min(Number(limit), 100) : 30);
  }
}
