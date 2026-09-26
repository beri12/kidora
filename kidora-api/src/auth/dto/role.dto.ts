import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SELF_SIGNUP_ROLES } from './auth.dto';

/**
 * Answers "How will you use Kidora?" for an account that signed up through
 * email or a social provider, where no role was chosen up front. A student's
 * profile step (date of birth, grade, school) arrives in the same request.
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

  @ApiPropertyOptional({ example: '2016-04-21', description: 'Student date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'School picked from search. Without its join code this only requests to join.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  schoolId?: string;

  @ApiPropertyOptional({ example: 'Grade 4', description: 'Student grade' })
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

