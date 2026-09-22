import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

export class BrowseCoursesDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional({ enum: ['newest', 'popular', 'progress', 'title'] })
  @IsOptional() @IsEnum(['newest', 'popular', 'progress', 'title'] as const)
  sort?: 'newest' | 'popular' | 'progress' | 'title';
}

export class LessonProgressDto {
  @ApiPropertyOptional({ description: 'How far through the lesson, 0-100. Never moves backwards.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) percent?: number;
  @ApiPropertyOptional({ description: 'Seconds since the last save; added to the running total.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(86400) timeSpentSec?: number;
}
