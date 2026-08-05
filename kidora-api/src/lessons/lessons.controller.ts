import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AppRole } from '../common/enums/role.enum';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private prisma: PrismaService) {}

  @Public() @Get(':id')
  async one(@Param('id') id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id }, include: { resources: true, quiz: { include: { questions: true } }, course: true } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(AppRole.TEACHER, AppRole.ADMIN) @Post()
  create(@Body() body: { courseId: string; title: string; type?: any; duration?: string; order?: number }) {
    return this.prisma.lesson.create({ data: { courseId: body.courseId, title: body.title, type: body.type ?? 'VIDEO', duration: body.duration ?? '5 min', order: body.order ?? 0 } });
  }
}
