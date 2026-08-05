import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() body?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() skinColor?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() hair?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() face?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() clothes?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() accessories?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() pet?: string;
}
