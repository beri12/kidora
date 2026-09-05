import {
  Body, Controller, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Get,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/dto/Jwt-auth.guard';
import { RolesGuard } from '../auth/dto/Roles.guard';
import { Roles } from '../auth/dto/Roles.decorator';
import { CurrentUser } from '../auth/dto/Current-user.decorator';

import { CoursesService } from './courses.service';
import {
  CreateDraftCourseDto,
  UpdateDraftCourseDto,
  SaveCurriculumDto,
  PublishCourseDto,
} from './dto/Course-wizard.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // --- literal-path routes first, before any :id wildcard routes ---

  @Get('mine')
  listMine(@CurrentUser('id') teacherId: string) {
    return this.coursesService.listMine(teacherId);
  }

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/videos',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('video/')) return cb(new BadRequestException('File must be a video'), false);
      cb(null, true);
    },
  }))
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/videos/${file.filename}`, fileName: file.originalname };
  }

  @Post('upload/thumbnail')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/thumbnails',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('File must be an image'), false);
      cb(null, true);
    },
  }))
  uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/thumbnails/${file.filename}`, fileName: file.originalname };
  }

  // The teacher upload form offers "MP4, PDF, PNG, JPG". Videos and images
  // have endpoints above; without this one a PDF was rejected by both of them.
  @Post('upload/document')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/documents',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new BadRequestException('File must be a PDF, Word document or text file'), false);
      }
      cb(null, true);
    },
  }))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/documents/${file.filename}`, fileName: file.originalname };
  }

  @Post('draft')
  @HttpCode(HttpStatus.CREATED)
  createDraft(@CurrentUser('id') teacherId: string, @Body() dto: CreateDraftCourseDto) {
    return this.coursesService.createDraft(teacherId, dto);
  }

  // --- :id wildcard routes last ---

  @Patch(':id/draft')
  @HttpCode(HttpStatus.OK)
  updateDraft(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseId: string,
    @Body() dto: UpdateDraftCourseDto,
  ) {
    return this.coursesService.updateDraft(teacherId, courseId, dto);
  }

  @Patch(':id/curriculum')
  @HttpCode(HttpStatus.OK)
  saveCurriculum(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseId: string,
    @Body() dto: SaveCurriculumDto,
  ) {
    return this.coursesService.saveCurriculum(teacherId, courseId, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseId: string,
    @Body() dto: PublishCourseDto,
  ) {
    return this.coursesService.publish(teacherId, courseId, dto);
  }
}