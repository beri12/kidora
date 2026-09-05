import { IsEmail, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
export class CreateStudentDto { @IsString() @MaxLength(120) name!: string; @IsEmail() email!: string; @IsOptional() @IsString() displayName?: string; @IsOptional() @IsString() gradeId?: string; @IsOptional() @IsString() classId?: string; @IsOptional() @IsEmail() parentEmail?: string; }
export class CreateTeacherDto { @IsString() @MaxLength(120) name!: string; @IsEmail() email!: string; @IsOptional() @IsString() subjectId?: string; }
export class CreateClassDto { @IsString() @MaxLength(60) name!: string; @IsString() gradeId!: string; @IsOptional() @IsString() academicYear?: string; @IsOptional() @IsString() teacherId?: string; @IsOptional() @IsString() subjectId?: string; }
export class ReviewCourseDto { @IsBoolean() approve!: boolean; @IsOptional() @IsString() @MaxLength(1000) note?: string; }
