import {
  IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength,
  Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ContentType, CourseAccess, Difficulty, LessonStatus, LessonType, QuestionType,
  SubmissionType,
} from '@prisma/client';

/**
 * Skip URL validation when the field was emptied. A cleared image field posts
 * "", which is the teacher asking to remove the image, not a malformed URL.
 */
const notBlank = (_o: unknown, value: unknown) => typeof value === 'string' && value.trim().length > 0;

/* ------------------------------------------------------------------ course */

export class CourseBasicsDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectSlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) ageBand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) subtitleLanguage?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) learningPoints?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) requirements?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) subCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) topic?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(notBlank) @IsUrl({ require_tld: false }) thumbnailUrl?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(notBlank) @IsUrl({ require_tld: false }) bannerUrl?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(notBlank) @IsUrl({ require_tld: false }) trailerUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) estimatedMinutes?: number;
  @ApiPropertyOptional({ enum: CourseAccess }) @IsOptional() @IsEnum(CourseAccess) access?: CourseAccess;
}

/** Every field optional — the wizard patches whichever step the teacher is on. */
export class UpdateCourseDto extends PartialType(CourseBasicsDto) {}

export class CompletionRulesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireAllLessons?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireAllQuizzes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireAllAssignments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireFinalExam?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() issuesCertificate?: boolean;
}

/* ----------------------------------------------------------------- section */

export class SectionDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ description: 'Which week of the course this module is.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(104) weekNumber?: number;
}
export class UpdateSectionDto extends PartialType(SectionDto) {}

export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Ids in their new order.' })
  @IsArray() @IsString({ each: true }) ids!: string[];
}

/* ------------------------------------------------------------------ lesson */

export class LessonDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional({ enum: LessonType }) @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @ApiPropertyOptional({ enum: LessonStatus }) @IsOptional() @IsEnum(LessonStatus) status?: LessonStatus;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) estimatedMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
}
export class UpdateLessonDto extends PartialType(LessonDto) {}

/* ---------------------------------------------------------- content blocks */

export class CheckpointDto {
  @ApiProperty({ description: 'Seconds into the video where the video pauses.' })
  @Type(() => Number) @IsInt() @Min(0) atSeconds!: number;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(500) prompt!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) options!: string[];
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) correct!: number;
}

export class DownloadDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) name!: string;
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
}

export class ContentBlockDto {
  @ApiProperty({ enum: ContentType }) @IsEnum(ContentType) type!: ContentType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100000) body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
  @ApiPropertyOptional() @IsOptional() meta?: Record<string, unknown>;

  // --- item metadata ---
  @ApiPropertyOptional({ description: 'How long this item takes, in minutes.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(600) estimatedMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;

  // --- video ---
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSeconds?: number;
  @ApiPropertyOptional({ description: 'WebVTT captions.' })
  @IsOptional() @IsString() @MaxLength(500000) transcriptVtt?: string;
  @ApiPropertyOptional({ type: [CheckpointDto], description: 'Ungraded in-video checks.' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CheckpointDto)
  checkpoints?: CheckpointDto[];

  // --- reading ---
  @ApiPropertyOptional({ type: [DownloadDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DownloadDto)
  downloadUrls?: DownloadDto[];

  // --- assessment items ---
  @ApiPropertyOptional({ description: 'For a QUIZ item: the quiz it points at.' })
  @IsOptional() @IsString() quizId?: string;
  @ApiPropertyOptional({ description: 'For an ASSIGNMENT or PEER_REVIEW item.' })
  @IsOptional() @IsString() assignmentId?: string;
}
export class UpdateContentBlockDto extends PartialType(ContentBlockDto) {}

/** Replaces every block on a lesson in one call — what the block editor saves. */
export class SaveContentDto {
  @ApiProperty({ type: [ContentBlockDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ContentBlockDto)
  blocks!: ContentBlockDto[];
}

/* -------------------------------------------------------------------- quiz */

export class QuestionDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(2000) prompt!: string;
  @ApiPropertyOptional({ enum: QuestionType }) @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @ApiPropertyOptional({ description: 'Index of the correct option (single-answer types).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) correct?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) correctOptions?: number[];
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) correctOrder?: number[];
  @ApiPropertyOptional({ description: '[{ left, right }] for MATCHING.' })
  @IsOptional() @IsArray() pairs?: { left: string; right: string }[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) answerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) explanation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) hint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) points?: number;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
}

export class QuizDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lessonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) timeLimitSec?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) maxAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffle?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleAnswers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showExplanations?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showScore?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowRetry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional({ enum: ['FORMATIVE', 'SUMMATIVE'], description: 'Formative is practice; summative counts.' })
  @IsOptional() @IsIn(['FORMATIVE', 'SUMMATIVE']) grading?: 'FORMATIVE' | 'SUMMATIVE';
  @ApiPropertyOptional({ type: [QuestionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuestionDto)
  questions?: QuestionDto[];
}
export class UpdateQuizDto extends PartialType(QuizDto) {}

/* -------------------------------------------------------------- assignment */

export class RubricRowDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) criterion!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(1000) points!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class AssignmentDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lessonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) maxScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowLate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowResubmit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional({ enum: SubmissionType }) @IsOptional() @IsEnum(SubmissionType) submissionType?: SubmissionType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) allowedFileTypes?: string[];
  @ApiPropertyOptional({ type: [RubricRowDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RubricRowDto)
  rubric?: RubricRowDto[];
  @ApiPropertyOptional({ description: 'How many classmates review each submission. 0 = teacher grades it.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) peerReviewCount?: number;
  @ApiPropertyOptional({ description: 'Reviews a student must complete before their own marks are released.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) peerReviewsDue?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: { name: string; url: string; sizeBytes?: number }[];
}
export class UpdateAssignmentDto extends PartialType(AssignmentDto) {}

/* -------------------------------------------------------------------- exam */

export class ExamDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() availableFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() availableUntil?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() issuesCertificate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffle?: boolean;
  @ApiPropertyOptional({ type: [QuestionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuestionDto)
  questions?: QuestionDto[];
}
export class UpdateExamDto extends PartialType(ExamDto) {}

/* --------------------------------------------------------------- resources */

export class ResourceDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) name!: string;
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lessonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sizeBytes?: number;
}

/* ---------------------------------------------------------- studio extras */

export class OutcomeDto {
  @ApiProperty({ example: 'Compare two fractions' })
  @IsString() @MinLength(2) @MaxLength(300) text!: string;
  @ApiPropertyOptional({ description: "Attach to a module instead of the whole course." })
  @IsOptional() @IsString() sectionId?: string;
}
export class UpdateOutcomeDto extends PartialType(OutcomeDto) {}

export class InstructorDto {
  @ApiProperty({ description: 'The teacher\'s Kidora email.' })
  @IsString() @MaxLength(200) email!: string;
  @ApiPropertyOptional({ enum: ['LEAD', 'CO_INSTRUCTOR', 'ASSISTANT'] })
  @IsOptional() @IsIn(['LEAD', 'CO_INSTRUCTOR', 'ASSISTANT']) role?: 'LEAD' | 'CO_INSTRUCTOR' | 'ASSISTANT';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}
