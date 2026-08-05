import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('conversations')
  conversations(@CurrentUser() u: AuthUser) { return this.chat.conversations(u.id); }

  @Post('dm')
  dm(@CurrentUser() u: AuthUser, @Body() body: { userId: string }) { return this.chat.ensureDm(u.id, body.userId); }

  @Post('group')
  group(@CurrentUser() u: AuthUser, @Body() body: { type: string; title: string; memberIds: string[] }) {
    return this.chat.createGroup(body.type, body.title, [u.id, ...body.memberIds]);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string, @Query('before') before?: string) { return this.chat.messages(id, before); }

  @Get(':id/search')
  search(@Param('id') id: string, @Query('q') q: string) { return this.chat.search(id, q); }
}
