import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ minLength: 6 }) @IsString() @MinLength(6) password!: string;
@ApiProperty({ enum: ['PARENT', 'TEACHER', 'SCHOOL_LEADER'], required: false })
@IsOptional() @IsEnum(Role) role?: Role;
}
export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
  @ApiProperty({ required: false, description: '6-digit TOTP if MFA enabled' }) @IsOptional() @IsString() mfaCode?: string;
}
export class RefreshDto { @ApiProperty() @IsString() refreshToken!: string; }
export class MfaVerifyDto { @ApiProperty() @IsString() code!: string; }
