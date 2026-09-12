import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AnalyseClassDto, LessonPlanDto, QuizDraftDto, TutorChatDto } from './dto/ai.dto';

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

  /* ------------------------------------------- teaching aids (teachers only) */

  /**
   * Every route below returns a DRAFT. There is no endpoint that writes
   * generated content into a course: a teacher reviews it, edits it, and saves
   * it through the ordinary authoring API, which validates it like anything
   * else they wrote. Nothing generated here reaches a student on its own.
   */
  @Post('teaching/lesson-plan')
  lessonPlan(@CurrentUser() u: AuthUser, @Body() dto: LessonPlanDto) {
    return this.ai.lessonPlan(u, dto);
  }

  @Post('teaching/quiz')
  quizDraft(@CurrentUser() u: AuthUser, @Body() dto: QuizDraftDto) {
    return this.ai.quizDraft(u, dto);
  }

  /** The figures come from the database, not the request body. */
  @Post('teaching/analyse-class')
  analyseClass(@CurrentUser() u: AuthUser, @Body() dto: AnalyseClassDto) {
    return this.ai.analyseClass(u, dto);
  }

  /** Lets the UI tell a child "the tutor is offline" before they type. */
  @Get('health')
  health() {
    return this.ai.health();
  }
}
