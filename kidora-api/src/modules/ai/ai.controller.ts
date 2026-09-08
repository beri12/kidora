import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { TutorChatDto } from './dto/ai.dto';

/**
 * Public face of the AI system. Everything here is authenticated, and the
 * service re-checks which learner the caller may ask about — the Python
 * service is never given the chance to decide.
 */
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  /**
   * `studentId` is only meaningful for a parent or teacher, and is rejected
   * unless they are proven to be linked to that learner.
   */
  @Post('tutor/chat')
  tutorChat(
    @CurrentUser() u: AuthUser,
    @Body() dto: TutorChatDto,
    @Query('studentId') studentId?: string,
  ) {
    return this.ai.tutorChat(u, dto, studentId);
  }

  /** Lets the UI tell a child "the tutor is offline" before they type. */
  @Get('health')
  health() {
    return this.ai.health();
  }
}
