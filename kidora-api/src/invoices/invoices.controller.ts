import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  @Get() mine(@CurrentUser() u: AuthUser) { return this.invoices.forUser(u.id); }
  @Get(':id/pdf') pdf(@Param('id') id: string) { return { message: 'PDF generation stub for invoice ' + id }; }
}
