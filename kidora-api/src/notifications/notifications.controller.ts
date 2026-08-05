import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.notifications.list(u.id); }
  @Get('unread-count') unread(@CurrentUser() u: AuthUser) { return this.notifications.unreadCount(u.id); }
  @Patch(':id/read') read(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.notifications.markRead(u.id, id); }
}
