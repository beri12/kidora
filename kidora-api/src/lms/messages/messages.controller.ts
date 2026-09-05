import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';

class SendDto { @IsString() @MaxLength(4000) body!: string; }
class OpenDto { @IsString() userId!: string; @IsOptional() @IsString() studentId?: string; }

@ApiTags('messages') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
@Controller('lms/messages')
export class MessagesController {
  constructor(private svc: MessagesService) {}
  @Get('conversations') list(@CurrentUser() u: AuthUser) { return this.svc.conversations(u); }
  @Post('conversations') open(@CurrentUser() u: AuthUser, @Body() dto: OpenDto) { return this.svc.open(u, dto.userId, dto.studentId); }
  @Get('conversations/:id') messages(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.messages(u, id); }
  @Post('conversations/:id') send(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SendDto) { return this.svc.send(u, id, dto.body); }
}
