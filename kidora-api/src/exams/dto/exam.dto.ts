import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ExamQuestionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) prompt!: string;
  @ApiPropertyOptional({ enum: QuestionType }) @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) correct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() correctText?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() data?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) points?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) explanation?: string;
}

export class CreateExamDto {
  @ApiProperty() @IsString() courseId!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) timeLimitMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) questionCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleOptions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFinal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional({ type: [ExamQuestionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExamQuestionDto)
  questions?: ExamQuestionDto[];
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class SubmitExamDto {
  /**
   * Answers keyed by question id. Only a response is accepted — score, passed,
   * xp and attempt number are all computed on the server.
   */
  @ApiProperty() @IsObject() answers!: Record<string, unknown>;
}
