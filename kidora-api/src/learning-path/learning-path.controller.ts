import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { World } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('learning-path')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning-path')
export class LearningPathController {
  constructor(private paths: LearningPathService) {}

  @Get() mine(@CurrentUser() u: AuthUser) { return this.paths.forStudent(u.id); }
  @Post() set(@CurrentUser() u: AuthUser, @Body() body: { world: World; progress: number }) { return this.paths.setProgress(u.id, body.world, body.progress); }
}
