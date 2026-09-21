import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrgRequestStatus } from '@prisma/client';
import { OrgAccessService } from './org-access.service';
import { ReviewDecisionDto } from './dto/org-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums/role.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/**
 * The reviewer's side. Restricted to Kidora staff: approving one of these
 * writes an administrative role onto somebody's account, so it must never be
 * reachable by the school and district roles it hands out.
 */
@ApiTags('org-access-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/org-requests')
export class OrgAdminController {
  constructor(private org: OrgAccessService) {}

  @Get()
  @ApiOperation({ summary: 'Review queue, oldest first' })
  @ApiQuery({ name: 'status', required: false, enum: [...Object.values(OrgRequestStatus), 'OPEN'] })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  list(
    @Query('status') status?: OrgRequestStatus | 'OPEN',
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.org.list(status ?? 'OPEN', Number(take) || 25, Number(skip) || 0);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve: create or link the organisation and activate the role' })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewDecisionDto,
    @Req() req: any,
  ) {
    return this.org.approve(id, user.id, dto.decisionNote, req.ip);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Refuse, with a reason the applicant will see' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewDecisionDto,
    @Req() req: any,
  ) {
    return this.org.reject(id, user.id, dto.decisionNote ?? '', req.ip);
  }

  @Post(':id/request-changes')
  @ApiOperation({ summary: 'Ask for more evidence; the request stays open' })
  requestChanges(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewDecisionDto,
    @Req() req: any,
  ) {
    return this.org.requestChanges(id, user.id, dto.decisionNote ?? '', req.ip);
  }
}
