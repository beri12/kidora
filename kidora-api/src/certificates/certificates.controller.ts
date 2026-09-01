import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}
  @Get('me') mine(@CurrentUser() u: AuthUser) { return this.certificates.forUser(u.id); }

  // Public verification by printed serial. Returns only what appears on the
  // certificate itself — no account, email or internal id.
  @Public() @Get('verify/:serial')
  verify(@Param('serial') serial: string) { return this.certificates.verify(serial); }

  // Explains what is still outstanding before a certificate can be issued.
  @Get('eligibility/:courseId')
  eligibility(@CurrentUser() u: AuthUser, @Param('courseId') courseId: string) {
    return this.certificates.checkEligibility(u.id, courseId);
  }

  @Get(':id') one(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.certificates.one(u.id, id);
  }
}
