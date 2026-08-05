import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.prisma.user.findUnique({ where: { id: u.id }, select: { id: true, name: true, email: true, role: true, points: true, streak: true, avatarColor: true, subscription: { select: { plan: true } } } });
  }

  @UseGuards(RolesGuard) @Roles(AppRole.ADMIN) @Get()
  all() { return this.prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }); }
}
