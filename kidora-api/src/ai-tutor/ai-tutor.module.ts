import { Module } from '@nestjs/common';
import { AiTutorService } from './ai-tutor.service';
import { AiTutorController } from './ai-tutor.controller';
@Module({ providers: [AiTutorService], controllers: [AiTutorController] })
export class AiTutorModule {}
