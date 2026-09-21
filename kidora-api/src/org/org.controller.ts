import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgAccessService } from './org-access.service';
import { SubmitOrgRequestDto } from './dto/org-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/**
 * The applicant's side of school / district verification.
 *
 *   POST /org/requests     submit the claim (or redeem an invitation code)
 *   GET  /org/requests/me  what the "pending approval" screen polls
 */
@ApiTags('org-access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('org/requests')
export class OrgController {
  constructor(private org: OrgAccessService) {}

  @Post()
  @ApiOperation({
    summary: 'Apply for a school or district role',
    description:
      'Records the claim and leaves the account’s role untouched. A valid joinCode approves ' +
      'it on the spot; otherwise it waits for a reviewer.',
  })
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitOrgRequestDto) {
    return this.org.submit(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'The most recent request on this account, with its status' })
  mine(@CurrentUser() user: AuthUser) {
    return this.org.mine(user.id);
  }
}
