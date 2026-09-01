import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';
import { SchoolAccessGuard } from '../common/tenancy/school-access.guard';
import { Tenant } from '../common/tenancy/tenant.decorator';
import { TenantContext } from '../common/tenancy/tenant.types';

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard)
@Roles(AppRole.TEACHER, AppRole.SCHOOL_ADMIN, AppRole.SCHOOL_LEADER, AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(private prisma: PrismaService) {}

  @Get('courses')
  myCourses(@CurrentUser() u: AuthUser) {
    return this.prisma.course.findMany({
      where: { teacherId: u.id },
      include: { _count: { select: { lessons: true, enrollments: true } } },
    });
  }

  /**
   * The teacher's own roster: students enrolled in their courses, or in a class
   * they run, within their own school.
   *
   * This previously returned every CHILD account on the platform, which leaked
   * one school's children to every other school's teachers. The query is now
   * derived from the caller's tenant and their own enrolments.
   */
  @Get('students')
  async students(@Tenant() tenant: TenantContext, @Query('courseId') courseId?: string) {
    const [enrolled, homeroom] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          status: { not: 'DROPPED' },
          course: courseId
            ? { id: courseId, teacherId: tenant.userId }
            : { teacherId: tenant.userId },
        },
        select: { studentId: true },
      }),
      this.prisma.classEnrollment.findMany({
        where: { active: true, class: { homeroomTeacherId: tenant.userId } },
        select: { studentId: true },
      }),
    ]);

    const ids = [...new Set([...enrolled, ...homeroom].map((r) => r.studentId))];

    // A school admin sees the whole school; a teacher sees only their own.
    const where = tenant.isSchoolAdmin && tenant.schoolId
      ? { schoolId: tenant.schoolId, role: 'CHILD' as const }
      : { id: { in: ids }, ...(tenant.schoolId ? { schoolId: tenant.schoolId } : {}) };

    if (!tenant.isSchoolAdmin && ids.length === 0) return [];

    const kids = await this.prisma.user.findMany({
      where,
      take: 200,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, points: true, avatarColor: true,
        grade: { select: { name: true } },
        courseProgress: { select: { percent: true, completed: true } },
      },
    });

    return kids.map((k) => {
      const rows = k.courseProgress;
      const progress = rows.length
        ? Math.round(rows.reduce((a, r) => a + r.percent, 0) / rows.length)
        : 0;
      return {
        id: k.id,
        name: k.name,
        initial: k.name[0],
        avatarColor: k.avatarColor,
        grade: k.grade?.name ?? null,
        progress,
        // Support-oriented wording; never a public ranking of children.
        status: progress >= 80 ? 'Ahead' : progress >= 30 ? 'On track' : 'Needs support',
      };
    });
  }
}
