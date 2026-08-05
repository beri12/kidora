import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesModule } from '../certificates/certificates.module';
@Module({ imports: [RewardsModule, NotificationsModule, CertificatesModule], providers: [ProgressService], controllers: [ProgressController] })
export class ProgressModule {}
