import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto, SubmitQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';

const STAFF = [
  AppRole.TEACHER,
  AppRole.SCHOOL_ADMIN,
  AppRole.SCHOOL_LEADER,
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
] as const;

@ApiTags('quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzes: QuizzesService) {}

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard) @Roles(...STAFF) @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateQuizDto) { return this.quizzes.create(t, dto); }

  // Unchanged public read. Answer keys are stripped server-side.
  @Public() @Get(':id') get(@Param('id') id: string) { return this.quizzes.get(id); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get(':id/attempts')
  attempts(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.quizzes.attempts(id, u.id); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: SubmitQuizDto) {
    // Accepts the original positional array or the keyed form; the score is
    // always computed on the server from whichever arrives.
    return this.quizzes.submit(id, u.id, dto.responses ?? dto.answers ?? []);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard) @Roles(...STAFF) @Patch(':id')
  update(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzes.update(t, id, dto);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard) @Roles(...STAFF) @Delete(':id')
  remove(@Tenant() t: TenantContext, @Param('id') id: string) { return this.quizzes.remove(t, id); }
}
