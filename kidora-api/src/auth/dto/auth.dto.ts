
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * Roles a visitor is allowed to select during self-registration.
 *
 * ADMIN, SUPER_ADMIN and CHILD are deliberately excluded:
 * - ADMIN / SUPER_ADMIN accounts should be created by an authorized admin.
 * - CHILD accounts should normally be created through a parent/school flow.
 *
 * SCHOOL_ADMIN and DISTRICT_ADMIN are allowed because Kidora supports
 * school and district onboarding during registration.
 */
export const SELF_SIGNUP_ROLES = [
  Role.PARENT,
  Role.TEACHER,
  Role.SCHOOL_ADMIN,
  Role.SCHOOL_LEADER,
  Role.DISTRICT_ADMIN,
] as const;

export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

/**
 * Register a new Kidora account.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'Abebe Bekele',
    description: 'Full name of the user',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'abebe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    maxLength: 72,
    description: 'Password must contain at least 8 characters',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({
    enum: SELF_SIGNUP_ROLES,
    default: Role.PARENT,
    description: 'Role selected during self-registration',
  })
  @IsOptional()
  @IsIn(SELF_SIGNUP_ROLES)
  role?: SelfSignupRole;

  /**
   * CHILD / TEACHER related field.
   * Example: "Grade 5"
   */
  @ApiPropertyOptional({
    example: 'Grade 5',
    description: 'Grade level associated with the account',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gradeLevel?: string;

  /**
   * TEACHER / school joining flow.
   * Allows the user to join an existing school.
   */
  @ApiPropertyOptional({
    example: 'K7M2QP',
    description: 'School invitation/join code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  schoolCode?: string;

  /**
   * TEACHER related field.
   */
  @ApiPropertyOptional({
    example: 'Mathematics',
    description: 'Teacher primary subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;

  /**
   * SCHOOL_ADMIN / SCHOOL_LEADER onboarding.
   */
  @ApiPropertyOptional({
    example: 'Sunrise Academy',
    description: 'School name when creating a new school',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  schoolName?: string;

  @ApiPropertyOptional({
    example: 'Ethiopia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  /**
   * DISTRICT_ADMIN onboarding.
   */
  @ApiPropertyOptional({
    example: 'Central District',
    description: 'District name when creating a new district',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  districtName?: string;

  @ApiPropertyOptional({
    example: 'Addis Ababa',
    description: 'Region/state associated with the district or school',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;
}

/**
 * Login
 */
export class LoginDto {
  @ApiProperty({
    example: 'abebe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
  })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit TOTP code if MFA is enabled',
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

/**
 * Refresh access token.
 */
export class RefreshDto {
  @ApiProperty({
    example: 'refresh-token-here',
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

/**
 * Verify MFA.
 */
export class MfaVerifyDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit MFA verification code',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

/**
 * Used by school administrators to create/invite
 * students and teachers.
 */
export class CreateMemberDto {
  @ApiProperty({
    example: 'Abebe Bekele',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'abebe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: [Role.CHILD, Role.TEACHER],
    description: 'Member role',
  })
  @IsEnum(Role)
  @IsIn([Role.CHILD, Role.TEACHER])
  role!: Role;

  @ApiPropertyOptional({
    example: 'clxxxxxxxxxxxx',
    description: 'Grade ID',
  })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({
    example: 'clxxxxxxxxxxxx',
    description: 'Class ID',
  })
  @IsOptional()
  @IsString()
  classId?: string;
}

