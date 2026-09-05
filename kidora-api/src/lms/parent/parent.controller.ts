import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, PARENT_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParentService } from './parent.service';

@ApiTags('parent') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...PARENT_ROLES)
@Controller('parent')
export class ParentController {
  constructor(private svc: ParentService) {}
  @Get('dashboard') dashboard(@CurrentUser() u: AuthUser, @Query('childId') childId?: string, @Query('range') range?: string) { return this.svc.dashboard(u, childId, range); }
  @Get('children') children(@CurrentUser() u: AuthUser) { return this.svc.children(u.id); }
  @Get('children/:id/progress') progress(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.progress(u, id); }
  @Get('children/:id/activity') activity(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query() q: PaginationDto) { return this.svc.activity(u, id, q); }
  @Get('children/:id/assignments') assignments(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('status') status?: string) { return this.svc.assignments(u, id, status); }
  @Get('children/:id/assessments') assessments(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.assessments(u, id); }
  @Get('children/:id/achievements') achievements(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.achievements(u, id); }
}
