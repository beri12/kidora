import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [RewardsModule, NotificationsModule], providers: [QuizzesService], controllers: [QuizzesController] })
export class QuizzesModule {}
