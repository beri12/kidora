import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

/** The educational events the client is allowed to report. */
export const TRACKED_EVENTS = [
  'course_started',
  'lesson_started',
  'lesson_completed',
  'activity_started',
  'activity_completed',
  'quiz_started',
  'quiz_completed',
  'assignment_submitted',
  'exam_started',
  'exam_completed',
  'course_completed',
  'certificate_issued',
  'quest_started',
  'quest_completed',
  'badge_unlocked',
  'reward_unlocked',
] as const;

export class TrackEventDto {
  // An allow-list rather than free text, so the event stream cannot be used as
  // an arbitrary write channel.
  @ApiProperty({ enum: TRACKED_EVENTS })
  @IsString()
  @IsIn(TRACKED_EVENTS as unknown as string[])
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() props?: Record<string, unknown>;
}
