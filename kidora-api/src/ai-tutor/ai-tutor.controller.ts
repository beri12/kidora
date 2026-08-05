import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AiTutorService } from './ai-tutor.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('ai-tutor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiTutorController {
  constructor(private ai: AiTutorService) {}

  @Post('chat') chat(@CurrentUser() u: AuthUser, @Body() dto: ChatDto) { return this.ai.chat(dto.studentId ?? u.id, dto.message); }
  @Get('chat/history') history(@CurrentUser() u: AuthUser) { return this.ai.history(u.id); }

  // Server-Sent Events stream — tokens arrive live for the tutor chat UI.
  @Post('chat/stream')
  async stream(@CurrentUser() u: AuthUser, @Body() dto: ChatDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    for await (const token of this.ai.stream(dto.studentId ?? u.id, dto.message)) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
