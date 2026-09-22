import {
  IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
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

/* --------------------------------------------- teaching aids (teachers only) */

export class LessonPlanDto {
  @ApiProperty({ example: 'Mathematics' }) @IsString() @MinLength(1) @MaxLength(80) subject!: string;
  @ApiProperty({ example: 'Grade 5' }) @IsString() @MinLength(1) @MaxLength(40) grade!: string;
  @ApiProperty({ example: 'Adding fractions' }) @IsString() @MinLength(1) @MaxLength(160) topic!: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(240) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class QuizDraftDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) subject!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(40) grade!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) topic!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) questionCount?: number;
  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) questionTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) language?: string;
}

/**
 * Note what is absent again: any class figures. The caller names a class or a
 * course; every number in the analysis is read from the database by this API
 * after checking the teacher actually teaches it. A browser cannot feed the
 * model invented statistics about a class it does not teach.
 */
export class AnalyseClassDto {
  @ApiPropertyOptional({ description: 'Class to analyse. Must be one you teach.' })
  @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional({ description: 'Course to analyse. Must be one you teach.' })
  @IsOptional() @IsString() courseId?: string;
  @ApiPropertyOptional({ description: 'A specific question about the class.' })
  @IsOptional() @IsString() @MaxLength(500) question?: string;
}
