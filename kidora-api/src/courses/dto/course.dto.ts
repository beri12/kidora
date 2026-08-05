import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty() @IsString() @MinLength(3) title!: string;
  @ApiProperty() @IsString() subjectSlug!: string;
  @ApiProperty({ enum: ['3-5', '6-8', '9-12'] }) @IsIn(['3-5', '6-8', '9-12']) ageBand!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isPremium?: boolean;
}