import {
  BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, SCHOOL_ADMIN_ROLES, TEACHER_ROLES } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

/** What a teacher may upload, and how large. */
const ACCEPT: Record<string, { mimes: RegExp; maxBytes: number; label: string }> = {
  video: { mimes: /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/, maxBytes: 500 * 1024 * 1024, label: 'a video' },
  audio: { mimes: /^audio\/(mpeg|mp3|wav|ogg|webm|aac|mp4)$/, maxBytes: 100 * 1024 * 1024, label: 'an audio file' },
  image: { mimes: /^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/, maxBytes: 10 * 1024 * 1024, label: 'an image' },
  document: {
    mimes: /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet)|application\/vnd\.ms-(excel|powerpoint)|text\/plain|text\/csv|text\/markdown)$/,
    maxBytes: 50 * 1024 * 1024,
    label: 'a document',
  },
  captions: { mimes: /^(text\/vtt|text\/plain|application\/x-subrip)$/, maxBytes: 2 * 1024 * 1024, label: 'a captions file' },
};

const LARGEST = Math.max(...Object.values(ACCEPT).map((a) => a.maxBytes));

function classify(mimetype: string) {
  for (const [kind, rule] of Object.entries(ACCEPT)) {
    if (rule.mimes.test(mimetype)) return { kind, rule };
  }
  return null;
}

/**
 * One upload endpoint for everything a teacher adds to a course.
 *
 * It goes through StorageService, so the same code writes to local disk in
 * development and to S3/R2 in production by changing STORAGE_DRIVER — the
 * three ad-hoc multer endpoints on the courses controller each hard-coded a
 * local directory and could never do that.
 *
 * Files are held in memory rather than streamed to disk by multer: the type is
 * checked against the real mime before anything is written, so an unwanted
 * file never lands on the filesystem at all.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...TEACHER_ROLES, ...SCHOOL_ADMIN_ROLES)
@Controller('uploads')
export class UploadsController {
  constructor(private storage: StorageService, private prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload one file. Returns the URL to store on the item.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LARGEST } }))
  async upload(@CurrentUser() u: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a file to upload.');

    const match = classify(file.mimetype);
    if (!match) {
      throw new BadRequestException(
        `Kidora does not accept ${file.mimetype || 'that file type'}. Upload a video, image, audio file, PDF, Office document or captions file.`,
      );
    }
    if (file.size > match.rule.maxBytes) {
      const mb = Math.round(match.rule.maxBytes / (1024 * 1024));
      throw new BadRequestException(`That file is too large. The limit for ${match.rule.label} is ${mb} MB.`);
    }

    const stored = await this.storage.save({
      originalname: file.originalname,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Remember it in the teacher's library so it can be reused on another
    // lesson without uploading twice.
    const resource = await this.prisma.resource.create({
      data: {
        name: stored.name,
        url: stored.url,
        kind: stored.kind,
        sizeBytes: stored.sizeBytes,
        mimeType: file.mimetype,
        teacherId: u.id,
        schoolId: u.schoolId,
      },
      select: { id: true },
    });

    return {
      id: resource.id,
      url: stored.url,
      name: stored.name,
      sizeBytes: stored.sizeBytes,
      kind: stored.kind,
      mimeType: file.mimetype,
      /** Which content block type this file naturally becomes. */
      contentType: match.kind === 'video' ? 'VIDEO'
        : match.kind === 'audio' ? 'AUDIO'
        : match.kind === 'image' ? 'IMAGE'
        : match.kind === 'captions' ? 'RESOURCE'
        : 'DOCUMENT',
    };
  }
}
