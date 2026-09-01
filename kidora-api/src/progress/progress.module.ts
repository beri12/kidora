import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { StudentsModule } from '../students/students.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [RewardsModule, NotificationsModule, CertificatesModule, StudentsModule, AnalyticsModule],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
