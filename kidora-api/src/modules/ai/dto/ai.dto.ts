import { IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class HistoryTurn {
  @IsString() @MaxLength(20) role!: string;
  @IsString() @MaxLength(2000) content!: string;
}

/**
 * Note what is absent: studentId. The learner is always the authenticated
 * caller (or, for a parent, a child they are proven to be linked to). Taking a
 * student id from the browser would let anyone read another child's context.
 */
export class TutorChatDto {
  @ApiProperty({ example: "I don't understand fractions" })
  @IsString() @MinLength(1) @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ description: 'Course the child is working in, for lesson-aware answers' })
  @IsOptional() @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ type: [HistoryTurn] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HistoryTurn)
  history?: HistoryTurn[];
}
