import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({ imports: [CoursesModule], controllers: [LessonsController] })
export class LessonsModule {}
