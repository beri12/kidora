import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportCategory, SupportPriority, SupportTicketStatus } from '@prisma/client';

export const CATEGORIES = Object.values(SupportCategory);
export const STATUSES = Object.values(SupportTicketStatus);
export const PRIORITIES = Object.values(SupportPriority);

export class CreateTicketDto {
  @ApiProperty({ example: 'I cannot see my child\'s progress' })
  @IsString() @MinLength(4) @MaxLength(160)
  subject!: string;

  @ApiProperty({ example: 'The progress page has been empty since Monday.' })
  @IsString() @MinLength(10) @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional() @IsIn(CATEGORIES)
  category?: SupportCategory;
}

export class ReplyTicketDto {
  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(4000)
  body!: string;
}

/** Support-staff only; the requester cannot move their own ticket's status. */
export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional() @IsIn(STATUSES)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional() @IsIn(PRIORITIES)
  priority?: SupportPriority;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assigneeId?: string;
}
