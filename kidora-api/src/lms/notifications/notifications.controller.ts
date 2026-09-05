import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('notifications') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
@Controller('lms/notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@CurrentUser() u: AuthUser, @Query('page') page = '1') {
    const p = Math.max(1, Number(page) || 1); const pageSize = 30;
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, skip: (p - 1) * pageSize, take: pageSize }),
      this.prisma.notification.count({ where: { userId: u.id } }),
      this.prisma.notification.count({ where: { userId: u.id, read: false } }),
    ]);
    return { items, total, page: p, pageSize, unread };
  }
  @Patch(':id/read') async read(@CurrentUser() u: AuthUser, @Param('id') id: string) { await this.prisma.notification.updateMany({ where: { id, userId: u.id }, data: { read: true } }); return { ok: true }; }
  @Patch('read-all') async readAll(@CurrentUser() u: AuthUser) { await this.prisma.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } }); return { ok: true }; }
}
