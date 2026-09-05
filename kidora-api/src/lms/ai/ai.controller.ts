import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AIKind } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { AiTutorService } from './ai-tutor.service';

class AskDto {
  @IsString() @MaxLength(2000) message!: string;
  @IsOptional() @IsEnum(['TUTOR', 'EXPLAIN', 'PRACTICE', 'HINT', 'MISTAKE', 'RECOMMEND', 'TEACHER_ASSIST']) kind?: AIKind;
  @IsOptional() @IsString() lessonId?: string; @IsOptional() @IsString() courseId?: string;
}

@ApiTags('ai') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('lms/ai')
export class AiController {
  constructor(private svc: AiTutorService) {}
  @Post('tutor') ask(@CurrentUser() u: AuthUser, @Body() dto: AskDto) { return this.svc.ask(u.id, dto); }
  @Get('tutor/history') history(@CurrentUser() u: AuthUser) { return this.svc.history(u.id); }
}
