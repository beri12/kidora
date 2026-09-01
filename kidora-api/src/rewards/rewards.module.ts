import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [EconomyModule],
  providers: [RewardsService],
  controllers: [RewardsController],
  exports: [RewardsService],
})
export class RewardsModule {}
