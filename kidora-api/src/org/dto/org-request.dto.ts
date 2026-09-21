import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * The roles that have to be verified before they are granted. Everything a
 * self-signup can ask for that is not on this list (PARENT, TEACHER) is
 * granted immediately by POST /auth/role.
 */
export const VERIFIED_ROLES = [Role.SCHOOL_ADMIN, Role.SCHOOL_LEADER, Role.DISTRICT_ADMIN] as const;
export type VerifiedRole = (typeof VERIFIED_ROLES)[number];

export function isVerifiedRole(role: unknown): role is VerifiedRole {
  return (VERIFIED_ROLES as readonly unknown[]).includes(role);
}

export class SubmitOrgRequestDto {
  @ApiProperty({ enum: VERIFIED_ROLES })
  @IsIn(VERIFIED_ROLES)
  requestedRole!: VerifiedRole;

  @ApiProperty({ example: 'Sunrise Academy', description: 'School or district name' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizationName!: string;

  @ApiProperty({ example: 'Principal', description: 'The applicant’s role inside the organisation' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  jobTitle!: string;

  @ApiPropertyOptional({
    example: 'K7M2QP',
    description:
      'School or district join code. A valid code approves the request immediately — ' +
      'the organisation vouched for the applicant by handing it over.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  joinCode?: string;

  @ApiPropertyOptional({ example: 'Ethiopia' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @ApiPropertyOptional({ example: 'https://sunrise.edu.et' })
  @IsOptional()
  @IsUrl({ require_protocol: false }, { message: 'Enter a valid website address' })
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({
    example: 'principal@sunrise.edu.et',
    description: 'An address on the organisation’s own domain carries the most weight in review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  workEmail?: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  studentCount?: number;

  @ApiPropertyOptional({
    description: 'URL of a letter or staff card, from POST /api/media/upload/file',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceUrl?: string;

  @ApiPropertyOptional({ description: 'Anything else the reviewer should know' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ReviewDecisionDto {
  @ApiPropertyOptional({
    example: 'We could not match this to the school’s public record.',
    description: 'Shown to the applicant. Required when refusing or asking for more.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNote?: string;
}
