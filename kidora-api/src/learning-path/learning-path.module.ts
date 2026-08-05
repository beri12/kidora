import { Module } from '@nestjs/common';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
@Module({ providers: [LearningPathService], controllers: [LearningPathController], exports: [LearningPathService] })
export class LearningPathModule {}
