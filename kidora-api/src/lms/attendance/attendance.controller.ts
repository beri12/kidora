import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { AttendanceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, SCHOOL_ADMIN_ROLES, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../common/tenancy.service';
import { ActivityService } from '../common/activity.service';

class MarkDto { @IsString() studentId!: string; @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']) status!: AttendanceStatus; @IsOptional() @IsString() note?: string; }
class MarkAttendanceDto { @IsString() classId!: string; @IsDateString() date!: string; @IsArray() @ValidateNested({ each: true }) @Type(() => MarkDto) marks!: MarkDto[]; }

@ApiTags('attendance') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...TEACHER_ROLES, ...SCHOOL_ADMIN_ROLES)
@Controller('lms/attendance')
export class AttendanceController {
  constructor(private prisma: PrismaService, private tenancy: TenancyService, private activity: ActivityService) {}

  /** Upsert one day's register for a class. */
  @Post() async mark(@CurrentUser() u: AuthUser, @Body() dto: MarkAttendanceDto) {
    await this.tenancy.assertTeacherOfClass(u, dto.classId);
    const cls = await this.prisma.schoolClass.findUniqueOrThrow({ where: { id: dto.classId }, select: { schoolId: true, name: true, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } } } });
    const allowed = new Set(cls.enrollments.map((e) => e.studentId));
    if (dto.marks.some((m) => !allowed.has(m.studentId))) throw new BadRequestException('A student in the list is not in this class.');
    const date = new Date(dto.date.slice(0, 10));
    await this.prisma.$transaction(dto.marks.map((m) => this.prisma.attendance.upsert({ where: { classId_studentId_date: { classId: dto.classId, studentId: m.studentId, date } }, create: { schoolId: cls.schoolId, classId: dto.classId, studentId: m.studentId, teacherId: u.id, date, status: m.status, note: m.note }, update: { status: m.status, note: m.note, teacherId: u.id } })));
    await this.activity.log({ userId: u.id, schoolId: cls.schoolId, type: 'ATTENDANCE_MARKED', title: `Marked attendance for ${cls.name}`, entityType: 'class', entityId: dto.classId });
    return { ok: true, count: dto.marks.length };
  }

  @Get() async list(@CurrentUser() u: AuthUser, @Query('classId') classId: string, @Query('from') from?: string, @Query('to') to?: string) {
    await this.tenancy.assertTeacherOfClass(u, classId);
    return this.prisma.attendance.findMany({ where: { classId, date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } }, orderBy: [{ date: 'desc' }], select: { id: true, date: true, status: true, note: true, student: { select: { id: true, name: true } } } });
  }

  /** Attendance rate per status for teacher/school analytics. */
  @Get('summary') async summary(@CurrentUser() u: AuthUser, @Query('classId') classId?: string, @Query('from') from?: string) {
    const schoolId = this.tenancy.requireSchool(u);
    if (classId) await this.tenancy.assertTeacherOfClass(u, classId);
    const where = { schoolId, ...(classId ? { classId } : {}), ...(from ? { date: { gte: new Date(from) } } : {}) };
    const g = await this.prisma.attendance.groupBy({ by: ['status'], where, _count: true });
    const total = g.reduce((a, x) => a + x._count, 0);
    return { total, byStatus: Object.fromEntries(g.map((x) => [x.status, x._count])), presentRate: total ? Math.round(((g.find((x) => x.status === 'PRESENT')?._count ?? 0) / total) * 100) : 0 };
  }
}
