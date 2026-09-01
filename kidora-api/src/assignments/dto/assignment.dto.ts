import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty() @IsString() courseId!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) points?: number;
  @ApiPropertyOptional({ enum: SubmissionType, isArray: true })
  @IsOptional() @IsArray() @IsEnum(SubmissionType, { each: true })
  submissionTypes?: SubmissionType[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) attachmentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() rubric?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lessonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) points?: number;
  @ApiPropertyOptional({ enum: SubmissionType, isArray: true })
  @IsOptional() @IsArray() @IsEnum(SubmissionType, { each: true })
  submissionTypes?: SubmissionType[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) attachmentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() rubric?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) text?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) attachmentUrls?: string[];
}

export class GradeAssignmentDto {
  @ApiProperty() @IsInt() @Min(0) score!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) feedback?: string;
  /** true returns the work for revision instead of marking it graded. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() returnForRevision?: boolean;
}
