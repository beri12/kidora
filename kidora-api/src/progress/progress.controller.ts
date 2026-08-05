import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private progress: ProgressService) {}
  @Get() mine(@CurrentUser() u: AuthUser) { return this.progress.forUser(u.id); }
  @Post() update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProgressDto) { return this.progress.update(u.id, dto); }
}
