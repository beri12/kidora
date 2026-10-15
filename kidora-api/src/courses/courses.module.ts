import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { PublicCoursesController } from './public-courses.controller';
import { CoursesService } from './courses.service';
// Adjust this import to wherever your PrismaModule actually lives.
import { PrismaModule } from '../database/prisma.module';
import { LmsModule } from '../lms/lms.module';

@Module({
  imports: [PrismaModule, LmsModule],
  controllers: [CoursesController, PublicCoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}