import { Module } from '@nestjs/common';
import { AiTutorService } from './ai-tutor.service';
import { AiTutorController } from './ai-tutor.controller';
import { AiModule } from '../modules/ai/ai.module';

@Module({ imports: [AiModule], providers: [AiTutorService], controllers: [AiTutorController] })
export class AiTutorModule {}
