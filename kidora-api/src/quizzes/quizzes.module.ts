import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [RewardsModule, NotificationsModule, CoursesModule],
  providers: [QuizzesService],
  controllers: [QuizzesController],
  exports: [QuizzesService],
})
export class QuizzesModule {}
