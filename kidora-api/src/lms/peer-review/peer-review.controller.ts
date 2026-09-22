import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, STUDENT_ROLES, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PeerReviewService } from './peer-review.service';

class ReviewScoreDto {
  @IsString() @MaxLength(300) criterion!: string;
  @Type(() => Number) @IsInt() @Min(0) points!: number;
}

class SubmitReviewDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReviewScoreDto) scores!: ReviewScoreDto[];
  @IsOptional() @IsString() @MaxLength(4000) comment?: string;
}

@ApiTags('peer-review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STUDENT_ROLES)
@Controller('peer-review')
export class PeerReviewController {
  constructor(private readonly svc: PeerReviewService) {}

  @Get('queue')
  @ApiOperation({ summary: "Work you have been asked to review. The author's name is never included." })
  queue(@CurrentUser() u: AuthUser) {
    return this.svc.myQueue(u);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: "Score a classmate's work against the rubric." })
  submit(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.svc.submitReview(u, id, dto);
  }

  @Get('assignments/:assignmentId/result')
  @ApiOperation({ summary: 'Your own marks — withheld until you have done your share of reviewing.' })
  result(@CurrentUser() u: AuthUser, @Param('assignmentId') assignmentId: string) {
    return this.svc.myResult(u, assignmentId);
  }
}

@ApiTags('peer-review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...TEACHER_ROLES)
@Controller('teacher/peer-review')
export class TeacherPeerReviewController {
  constructor(private readonly svc: PeerReviewService) {}

  @Get('assignments/:assignmentId')
  @ApiOperation({ summary: 'How far the reviewing has got.' })
  progress(@CurrentUser() u: AuthUser, @Param('assignmentId') assignmentId: string) {
    return this.svc.progress(u, assignmentId);
  }
}
