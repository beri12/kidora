import { Controller, Get, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class PublicCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  listPublished() {
    return this.coursesService.listPublished();
  }

  @Get(':id')
  getPublished(@Param('id') id: string) {
    return this.coursesService.getPublished(id);
  }
}