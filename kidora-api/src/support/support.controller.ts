import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto, ReplyTicketDto, UpdateTicketDto } from './dto/support.dto';

/**
 * Support tickets. Every route is authorised in the service: a normal user
 * only ever reaches their own tickets, and internal staff notes are filtered
 * out of what a requester is shown.
 */
@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private support: SupportService) {}

  @Get('tickets')
  list(@CurrentUser() u: AuthUser, @Query('status') status?: string) {
    return this.support.list(u, status);
  }

  @Get('tickets/:id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.support.get(u, id);
  }

  @Post('tickets')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTicketDto) {
    return this.support.create(u, dto);
  }

  @Post('tickets/:id/reply')
  reply(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    return this.support.reply(u, id, dto);
  }

  @Patch('tickets/:id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.support.update(u, id, dto);
  }

  @Patch('tickets/:id/close')
  close(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.support.close(u, id);
  }
}
