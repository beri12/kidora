import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzes: QuizzesService) {}
  @Public() @Get(':id') get(@Param('id') id: string) { return this.quizzes.get(id); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: SubmitQuizDto) { return this.quizzes.submit(id, u.id, dto.answers); }
}
