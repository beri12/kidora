import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { LmsCoursesController } from './lms-courses.controller';
import { BuilderController } from './builder.controller';
import { PublicCoursesController } from './public-courses.controller';
import { CoursesService } from './courses.service';
import { CourseAccessService } from './course-access.service';
import { CourseBuilderService } from './course-builder.service';
import { PrismaModule } from '../database/prisma.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [PrismaModule, RewardsModule],
  // Order matters: the wizard and LMS controllers declare literal paths
  // (`draft`, `mine`, `catalog`, `library`) that must be matched before
  // PublicCoursesController's `GET /courses/:id` wildcard.
  controllers: [CoursesController, LmsCoursesController, BuilderController, PublicCoursesController],
  providers: [CoursesService, CourseAccessService, CourseBuilderService],
  exports: [CoursesService, CourseAccessService, CourseBuilderService],
})
export class CoursesModule {}
