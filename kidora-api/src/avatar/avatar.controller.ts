import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvatarService } from './avatar.service';
import { UpdateAvatarDto } from './dto/avatar.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('avatar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AvatarController {
  constructor(private avatar: AvatarService) {}

  @Get('avatar') get(@CurrentUser() u: AuthUser) { return this.avatar.get(u.id); }
  @Put('avatar') update(@CurrentUser() u: AuthUser, @Body() dto: UpdateAvatarDto) { return this.avatar.update(u.id, dto); }
  @Get('avatar/items') items(@Query('category') category?: string) { return this.avatar.listItems(category); }
  @Get('inventory') inventory(@CurrentUser() u: AuthUser) { return this.avatar.inventory(u.id); }
  @Post('inventory/:itemId/equip') equip(@CurrentUser() u: AuthUser, @Param('itemId') itemId: string, @Body('equipped') equipped: boolean) { return this.avatar.equip(u.id, itemId, equipped ?? true); }
}
