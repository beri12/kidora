import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.TEACHER, AppRole.ADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(private prisma: PrismaService) {}

  @Get('courses')
  myCourses(@CurrentUser() u: AuthUser) {
    return this.prisma.course.findMany({
      where: { teacherId: u.id },
      orderBy: { createdAt: 'desc' },
      include: { subject: true, _count: { select: { lessons: true } } },
    });
  }

  /**
   * Students this teacher actually teaches.
   *
   * This used to select every CHILD on the platform, so any teacher could read
   * the roster of every school. It is now joined through ClassEnrollment ->
   * SchoolClass -> ClassTeacher, which is the same ownership rule the LMS
   * TeacherService applies. Platform admins still see their whole school.
   */
  @Get('students')
  async students(@CurrentUser() u: AuthUser) {
    const isAdmin = u.role === AppRole.ADMIN;

    const where: Prisma.UserWhereInput = isAdmin
      ? { role: 'CHILD', ...(u.schoolId ? { schoolId: u.schoolId } : {}) }
      : { role: 'CHILD', classEnrollments: { some: { class: { teachers: { some: { teacherId: u.id } } } } } };

    const kids = await this.prisma.user.findMany({
      where,
      take: 40,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, points: true },
    });

    return kids.map((k) => ({
      id: k.id,
      name: k.name,
      initial: k.name[0] ?? '?',
      progress: Math.min(100, Math.round(k.points / 40)),
      status: k.points > 2000 ? 'Ahead' : 'On track',
    }));
  }
}
