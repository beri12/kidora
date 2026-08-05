import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class UpdateProgressDto {
  @ApiProperty() @IsString() lessonId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(100) percent?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() completed?: boolean;
}
