import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgAdminController } from './org-admin.controller';
import { OrgAccessService } from './org-access.service';

// EmailService and SmsService come from their @Global modules.
@Module({
  controllers: [OrgController, OrgAdminController],
  providers: [OrgAccessService],
  exports: [OrgAccessService],
})
export class OrgModule {}
