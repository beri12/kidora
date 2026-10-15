import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CourseAccessService } from './course-access.service';

export class JoinByCodeDto {
  @IsString() @MaxLength(32) code!: string;
}
export class CodeEnabledDto {
  @IsBoolean() enabled!: boolean;
}
export class AssignCourseDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) studentIds!: string[];
}

/**
 * Course access codes and assignments. Role checks are per action inside the
 * service (a teacher manages only their courses, a parent assigns only to
 * their children), so the guard here only requires a signed-in account.
 */
@ApiTags('course-access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseAccessController {
  constructor(private readonly svc: CourseAccessService) {}

  @Post('access-code/join')
  @HttpCode(200)
  // Per IP on top of the per-student failure limit in the service.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Student joins a course with its access code (e.g. CPP-7K4M9X).' })
  join(@CurrentUser() u: AuthUser, @Body() dto: JoinByCodeDto) {
    return this.svc.joinByCode(u, dto.code);
  }

  @Get(':id/access-code')
  getCode(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getCode(u, id);
  }

  @Post(':id/access-code/rotate')
  @ApiOperation({ summary: 'Create the code, or replace it (the old one stops working).' })
  rotate(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.rotateCode(u, id);
  }

  @Patch(':id/access-code')
  setEnabled(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CodeEnabledDto) {
    return this.svc.setCodeEnabled(u, id, dto.enabled);
  }

  @Get(':id/assignable-students')
  assignable(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.assignableStudents(u, id);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Parent, teacher or school enrols their students in a course.' })
  assign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AssignCourseDto) {
    return this.svc.assign(u, id, dto.studentIds);
  }
}
