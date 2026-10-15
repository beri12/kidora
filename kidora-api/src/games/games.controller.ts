import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsDefined, IsInt, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { GamesService } from './games.service';

class StartDto {
  @IsInt() @Min(1) @Max(50)
  level!: number;
}

class AttemptDto {
  @IsString()
  challengeId!: string;

  /** An option index, a block program, or { angle, power } — the server judges it. */
  @IsDefined()
  answer!: unknown;
}

class HintDto {
  @IsString()
  challengeId!: string;
}

/**
 * Learning games. The client never sends a score, XP or "I won": it sends
 * answers, and every number is computed here from answers the server judged.
 */
@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  constructor(private games: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'Games with this learner’s progress' })
  list(@CurrentUser() u: AuthUser) { return this.games.list(u.id); }

  @Get('progress')
  @ApiOperation({ summary: 'Levels, XP from games and skill mastery' })
  progress(@CurrentUser() u: AuthUser) { return this.games.progress(u.id); }

  @Get('recommendations')
  recommendations(@CurrentUser() u: AuthUser) { return this.games.recommendations(u.id); }

  @Get('students/:studentId/progress')
  @ApiOperation({ summary: 'A learner’s game progress, for their parent, teacher or school leader' })
  studentProgress(@CurrentUser() u: AuthUser, @Param('studentId') id: string) { return this.games.studentProgress(u, id); }

  @Get('classes/:classId/mastery')
  @ApiOperation({ summary: 'Average mastery by skill for a class' })
  classMastery(@CurrentUser() u: AuthUser, @Param('classId') id: string) { return this.games.classMastery(u, id); }

  @Get(':slug')
  detail(@CurrentUser() u: AuthUser, @Param('slug') slug: string) { return this.games.detail(slug, u.id); }

  @Post(':slug/sessions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  start(@CurrentUser() u: AuthUser, @Param('slug') slug: string, @Body() dto: StartDto) { return this.games.start(u, slug, dto.level); }

  @Post('sessions/:id/attempt')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  attempt(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AttemptDto) { return this.games.attempt(u.id, id, dto.challengeId, dto.answer); }

  @Post('sessions/:id/hint')
  hint(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: HintDto) { return this.games.hint(u.id, id, dto.challengeId); }

  @Post('sessions/:id/complete')
  complete(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.games.complete(u.id, id); }

  @Get('sessions/:id')
  summary(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.games.summary(id, u.id); }
}
