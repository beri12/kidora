import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested, IsEnum, IsDateString, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto { @IsString() questionId!: string; @IsOptional() @IsArray() @ArrayMaxSize(20) selected?: number[]; @IsOptional() @IsString() @MaxLength(2000) answerText?: string; }
export class SubmitAttemptDto { @IsArray() @ValidateNested({ each: true }) @Type(() => AnswerDto) answers!: AnswerDto[]; }

export class CreateQuestionDto {
  @IsString() @MaxLength(2000) prompt!: string;
  @IsEnum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER']) type!: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER';
  @IsArray() @ArrayMaxSize(10) options!: string[];
  @IsOptional() @IsInt() correct?: number;
  @IsOptional() @IsArray() correctOptions?: number[];
  @IsOptional() @IsString() answerText?: string;
  @IsOptional() @IsInt() @Min(1) points?: number;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsEnum(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}
export class CreateQuizDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsEnum(['LESSON', 'PRACTICE', 'FINAL_EXAM']) kind?: 'LESSON' | 'PRACTICE' | 'FINAL_EXAM';
  @IsOptional() @IsInt() @Min(30) timeLimitSec?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) maxAttempts?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateQuestionDto) questions!: CreateQuestionDto[];
}
export class CreateAssignmentDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsInt() @Min(1) maxScore?: number;
  @IsOptional() @IsArray() attachments?: { name: string; url: string; sizeBytes: number }[];
  @IsOptional() @IsEnum(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}
export class GradeSubmissionDto { @IsInt() @Min(0) score!: number; @IsOptional() @IsString() @MaxLength(4000) feedback?: string; }
export class SubmitAssignmentDto { @IsOptional() @IsString() @MaxLength(20000) content?: string; @IsOptional() @IsArray() attachments?: { name: string; url: string; sizeBytes: number }[]; }
export class CreateExamDto {
  @IsString() @MaxLength(200) title!: string; @IsOptional() @IsString() description?: string;
  @IsString() courseId!: string; @IsOptional() @IsString() classId?: string; @IsString() quizId!: string;
  @IsOptional() @IsDateString() scheduledAt?: string; @IsOptional() @IsDateString() availableFrom?: string; @IsOptional() @IsDateString() availableUntil?: string;
  @IsOptional() @IsInt() @Min(5) durationMin?: number; @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
}
