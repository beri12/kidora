import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSchoolDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

export class CreateGradeDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) level?: number;
}

export class CreateClassDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() homeroomTeacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) academicYear?: string;
}

export class UpdateClassDto extends CreateClassDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AddClassStudentsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  studentIds!: string[];
}

export class AssignStudentGradeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
}

export class ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}
