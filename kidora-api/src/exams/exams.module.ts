import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { CoursesModule } from '../courses/courses.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CoursesModule, RewardsModule, CertificatesModule, NotificationsModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
