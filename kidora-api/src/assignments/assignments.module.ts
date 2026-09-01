import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { CoursesModule } from '../courses/courses.module';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CoursesModule, RewardsModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
