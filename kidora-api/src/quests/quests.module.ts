import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { CoursesModule } from '../courses/courses.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [CoursesModule, RewardsModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
