import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';
import { CalendarRangeDto, CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';

/**
 * One calendar for every role. What a caller sees is decided entirely in the
 * service from their role and relationships — a parent gets only their own
 * children, a teacher only their classes, school staff only their school.
 */
@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private calendar: CalendarService) {}

  @Get()
  range(@CurrentUser() u: AuthUser, @Query() q: CalendarRangeDto) {
    return this.calendar.range(u, q.from, q.to, q.childId, q.kinds);
  }

  @Get('upcoming')
  upcoming(@CurrentUser() u: AuthUser, @Query('days') days?: string, @Query('childId') childId?: string) {
    return this.calendar.upcoming(u, Math.min(90, Number(days) || 14), childId);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCalendarEventDto) {
    return this.calendar.create(u, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.calendar.update(u, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.calendar.remove(u, id);
  }
}
