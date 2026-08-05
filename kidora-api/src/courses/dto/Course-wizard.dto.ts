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

export class PublishCourseDto {
  @ValidateNested()
  @Type(() => CreateDraftCourseDto)
  basicInfo!: CreateDraftCourseDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];

  @ValidateNested()
  @Type(() => AdvanceInfoDto)
  advanceInfo!: AdvanceInfoDto;
}