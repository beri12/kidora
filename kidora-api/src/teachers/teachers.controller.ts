import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
    return this.prisma.course.findMany({ where: { teacherId: u.id }, include: { _count: { select: { lessons: true } } } });
  }

  // Demo roster — in production join through enrollments.
  @Get('students')
  async students() {
    const kids = await this.prisma.user.findMany({ where: { role: 'CHILD' }, take: 40, select: { id: true, name: true, points: true } });
    return kids.map((k) => ({ id: k.id, name: k.name, initial: k.name[0], progress: Math.min(100, Math.round(k.points / 40)), status: k.points > 2000 ? 'Ahead' : 'On track' }));
  }
}
