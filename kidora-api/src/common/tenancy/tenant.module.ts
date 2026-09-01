import { Global, Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { SchoolAccessGuard } from './school-access.guard';
import { AuditService } from '../services/audit.service';

@Global()
@Module({
  providers: [TenantService, SchoolAccessGuard, AuditService],
  exports: [TenantService, SchoolAccessGuard, AuditService],
})
export class TenantModule {}
