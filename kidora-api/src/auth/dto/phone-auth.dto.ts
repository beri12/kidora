import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SELF_SIGNUP_ROLES } from './auth.dto';

/**
 * E.164: a leading "+", a country code that never starts with 0, and at most
 * 15 digits in total. The web app builds this from the country picker's dial
 * code plus the digits the user typed, so the API only ever sees one shape.
 */
export const E164 = /^\+[1-9]\d{6,14}$/;

export class PhoneStartDto {
  @ApiProperty({ example: '+251911223344', description: 'Phone number in E.164 format' })
  @IsString()
  @Matches(E164, { message: 'Enter a valid phone number' })
  phone!: string;
}

export class PhoneVerifyDto {
  @ApiProperty({ example: '+251911223344' })
  @IsString()
  @Matches(E164, { message: 'Enter a valid phone number' })
  phone!: string;

  @ApiProperty({ example: '482913', description: '6-digit code sent by SMS' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code' })
  code!: string;

  @ApiPropertyOptional({
    example: 'Abebe Bekele',
    description: 'Display name, sent when this phone number is signing up for the first time',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    enum: SELF_SIGNUP_ROLES,
    description: 'Role picked before verifying. Can also be set afterwards via POST /auth/role.',
  })
  @IsOptional()
  @IsIn(SELF_SIGNUP_ROLES)
  role?: (typeof SELF_SIGNUP_ROLES)[number];
}

/**
 * Answers "How will you use Kidora?" for an account that signed up through a
 * phone number or a social provider, where no role was chosen up front.
 */
export class SelectRoleDto {
  @ApiProperty({ enum: SELF_SIGNUP_ROLES })
  @IsIn(SELF_SIGNUP_ROLES)
  role!: (typeof SELF_SIGNUP_ROLES)[number];

  @ApiPropertyOptional({ example: 'Abebe Bekele' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Grade 4', description: 'Student grade, used with a school code' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gradeLevel?: string;

  @ApiPropertyOptional({ example: 'K7M2QP', description: 'School invitation / join code' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  schoolCode?: string;

  @ApiPropertyOptional({ example: 'Sunrise Academy' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  schoolName?: string;

  @ApiPropertyOptional({ example: 'Central District' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  districtName?: string;
}

export type PhoneSignupRole = (typeof SELF_SIGNUP_ROLES)[number] | Role;
