import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @ApiProperty({ required: false, description: 'Student user id (defaults to the caller)' })
  @IsOptional() @IsString() studentId?: string;
  @ApiProperty({ description: 'The child\'s question or message' })
  @IsString() message: string;
}
