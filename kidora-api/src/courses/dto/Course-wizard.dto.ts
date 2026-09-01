import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDraftCourseDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() subCategoryId?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() subtitleLanguage?: string;
  @IsOptional() @IsString() levelId?: string;
  @IsOptional() @IsString() duration?: string;
}

export class UpdateDraftCourseDto extends CreateDraftCourseDto {}

class LectureQuizDto {
  @IsString() question!: string;
  @IsArray() @IsString({ each: true }) answers!: string[];
  @IsInt() correctAnswer!: number;
}

class LectureDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsInt() @Min(1) order!: number;
  @IsOptional() @IsString() videoFileName?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => LectureQuizDto)
  quiz?: LectureQuizDto;
}

class SectionDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsInt() @Min(1) order!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LectureDto)
  lectures!: LectureDto[];
}

export class SaveCurriculumDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

export class AdvanceInfoDto {
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() trailerUrl?: string;
  @IsString() description!: string;
  @IsArray() @IsString({ each: true }) learningPoints!: string[];
  @IsArray() @IsString({ each: true }) requirements!: string[];
  @IsArray() @IsString({ each: true }) tags!: string[];
}

// Every field is optional so POST /courses/:id/publish serves both callers:
// the 3-step wizard (which sends the whole course) and the LMS course builder
// (which has already saved its sections and just flips the flag). The original
// full payload still validates exactly as before.
export class PublishCourseDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDraftCourseDto)
  basicInfo?: CreateDraftCourseDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AdvanceInfoDto)
  advanceInfo?: AdvanceInfoDto;
}