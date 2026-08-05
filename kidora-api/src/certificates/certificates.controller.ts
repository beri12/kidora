import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}
  @Get('me') mine(@CurrentUser() u: AuthUser) { return this.certificates.forUser(u.id); }
}
