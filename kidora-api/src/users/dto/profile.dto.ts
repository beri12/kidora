import { IsBoolean, IsHexColor, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Fields a user may change about themselves.
 *
 * role, schoolId, districtId, gradeId, email, points and streak are all
 * deliberately absent: they are set by the school or earned through the LMS,
 * and the global ValidationPipe runs with whitelist:true, so anything else in
 * the body is stripped before the service sees it.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Leo' })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ example: '#8B5CF6' })
  @IsOptional() @IsHexColor()
  avatarColor?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/a.png' })
  @IsOptional() @IsString() @MaxLength(500)
  avatarUrl?: string;
}

export class NotificationPrefsDto {
  @IsOptional() @IsBoolean() assignments?: boolean;
  @IsOptional() @IsBoolean() exams?: boolean;
  @IsOptional() @IsBoolean() messages?: boolean;
  @IsOptional() @IsBoolean() achievements?: boolean;
  @IsOptional() @IsBoolean() email?: boolean;
}

/** Preferences stored in User.settings. */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: ['en', 'es', 'fr', 'ar', 'hi', 'zh'] })
  @IsOptional() @IsIn(['en', 'es', 'fr', 'ar', 'hi', 'zh'])
  language?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional() @IsIn(['light', 'dark', 'system'])
  appearance?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high'], description: 'Preferred difficulty for AI practice' })
  @IsOptional() @IsIn(['low', 'normal', 'high'])
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Show this account on public leaderboards' })
  @IsOptional() @IsBoolean()
  leaderboardVisible?: boolean;

  @ApiPropertyOptional({ type: NotificationPrefsDto })
  @IsOptional() @ValidateNested() @Type(() => NotificationPrefsDto)
  notifications?: NotificationPrefsDto;
}
