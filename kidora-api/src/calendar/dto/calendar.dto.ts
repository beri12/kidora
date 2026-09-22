import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType } from '@prisma/client';

export const EVENT_TYPES = Object.values(CalendarEventType);

/** Window to read. Both ends required so a query can never scan the whole table. */
export class CalendarRangeDto {
  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-09-30T23:59:59.999Z' })
  @IsDateString()
  to!: string;

  /** Parents pass this to narrow the calendar to one child. */
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  childId?: string;

  @ApiPropertyOptional({ description: 'Comma-separated source filter, e.g. "assignment,exam"' })
  @IsOptional() @IsString()
  kinds?: string;
}

export class CreateCalendarEventDto {
  @ApiProperty({ example: 'Parent-teacher meeting' })
  @IsString() @MinLength(2) @MaxLength(160)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: EVENT_TYPES })
  @IsOptional() @IsIn(EVENT_TYPES)
  type?: CalendarEventType;

  @ApiProperty({ example: '2026-09-12T14:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ example: '2026-09-12T15:00:00.000Z' })
  @IsOptional() @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '#8B5CF6' })
  @IsOptional() @IsString() @MaxLength(20)
  color?: string;

  // Audience. Each is authorised in the service before it is stored: a teacher
  // may only target a class they teach, a school admin only their own school.
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ description: 'Share with the whole school' })
  @IsOptional() @IsBoolean() schoolWide?: boolean;
}

export class UpdateCalendarEventDto extends CreateCalendarEventDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  declare title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  declare startsAt: string;
}
