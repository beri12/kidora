import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
} from 'class-validator';
import { ActivityType, CourseAccessType, CourseVisibility, LessonType } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ageBand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trailerUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) learningPoints?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) requirements?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ enum: CourseVisibility }) @IsOptional() @IsEnum(CourseVisibility) visibility?: CourseVisibility;
  @ApiPropertyOptional({ enum: CourseAccessType }) @IsOptional() @IsEnum(CourseAccessType) accessType?: CourseAccessType;
  @ApiPropertyOptional() @IsOptional() @IsString() prerequisiteCourseId?: string;
  // Only honoured for platform admins; a teacher's course always lands in their
  // own school (see CoursesService.resolveCourseSchool).
  @ApiPropertyOptional() @IsOptional() @IsString() schoolId?: string;
}

// PartialType keeps every validation rule but makes each field optional, so a
// PATCH can send just the fields it changes.
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreateSectionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class CreateLessonDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ enum: LessonType }) @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) estimatedMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() audioUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) documentUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class CreateActivityDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) instructions?: string;
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) type!: ActivityType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) points?: number;
  /** Everything the renderer needs to draw the activity — no answer key. */
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
  /** The answer key. Never serialised to a student. */
  @ApiPropertyOptional() @IsOptional() @IsObject() solution?: Record<string, unknown>;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class SubmitActivityDto {
  /** The learner's response. Shape depends on the activity type. */
  @ApiProperty() @IsObject() response!: Record<string, unknown>;
}

export class CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}
