import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates') @Controller('lms/certificates')
export class CertificatesController {
  constructor(private svc: CertificatesService) {}
  /** Public: GET /api/lms/certificates/verify/:code */
  @Get('verify/:code') verify(@Param('code') code: string) { return this.svc.verify(code); }
}
