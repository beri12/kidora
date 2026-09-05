import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, STUDENT_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { StudentService } from './student.service';
import { RewardsService } from '../gamification/rewards.service';

@ApiTags('student') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STUDENT_ROLES)
@Controller('student')
export class StudentController {
  constructor(private svc: StudentService, private rewards: RewardsService) {}

  @Get('dashboard') dashboard(@CurrentUser() u: AuthUser) { return this.svc.dashboard(u.id); }
  @Get('courses') courses(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.svc.courses(u.id, status); }
  @Get('quests') quests(@CurrentUser() u: AuthUser) { return this.svc.quests(u.id); }
  @Post('quests/:id/claim') async claim(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    try { const r = await this.rewards.claimQuest(u.id, id); return (await this.svc.quests(u.id)).find((q) => q.id === id) ?? r; }
    catch (e) { throw new BadRequestException((e as Error).message); }
  }
  @Get('assignments') assignments(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.svc.assignments(u.id, status); }
  @Get('quizzes') quizzes(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.svc.quizzes(u.id, status); }
  @Get('exams') exams(@CurrentUser() u: AuthUser) { return this.svc.exams(u.id); }
  @Get('certificates') certificates(@CurrentUser() u: AuthUser) { return this.svc.certificates(u.id); }
  @Get('achievements') achievements(@CurrentUser() u: AuthUser) { return this.svc.achievements(u.id); }
  @Get('badges') badges(@CurrentUser() u: AuthUser) { return this.svc.badges(u.id); }
  @Get('leaderboard') leaderboard(@CurrentUser() u: AuthUser, @Query('scope') scope: 'school' | 'class' = 'class', @Query('period') period: 'week' | 'month' = 'week') { return this.svc.leaderboard(u.id, scope === 'school' ? 'school' : 'class', period === 'month' ? 'month' : 'week'); }
  @Get('world') world(@CurrentUser() u: AuthUser) { return this.svc.world(u.id); }
  /** Called by the lesson player when a lesson is finished. Idempotent. */
  @Post('lessons/:id/complete') complete(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('timeSpentSec') t?: string) { return this.rewards.onLessonCompleted(u.id, id, Number(t ?? 0) || 0); }
}
