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

/**
 * The original contract was `{ answers: number[] }` (one option index per
 * question, positionally). That still validates. `responses` is the keyed form
 * the richer question types need. Either may be sent; neither carries a score.
 */
export class SubmitQuizDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional() @IsArray()
  answers?: number[];

  @ApiPropertyOptional({ description: 'Responses keyed by question id.' })
  @IsOptional() @IsObject()
  responses?: Record<string, unknown>;
}

export class QuizQuestionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) prompt!: string;
  @ApiPropertyOptional({ enum: QuestionType }) @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) correct?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() data?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) points?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) explanation?: string;
}

export class CreateQuizDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lessonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) timeLimitSec?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleOptions?: boolean;
  @ApiPropertyOptional({ type: [QuizQuestionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuizQuestionDto)
  questions?: QuizQuestionDto[];
}

export class UpdateQuizDto extends PartialType(CreateQuizDto) {}
