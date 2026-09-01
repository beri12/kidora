import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { CoursesModule } from '../courses/courses.module';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [CoursesModule, EconomyModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
