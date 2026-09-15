import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/dto/Jwt-auth.guard';
import { StorageService } from '../infrastructure/storage/storage.service';
import { StoredFile } from '../infrastructure/storage/storage.interface';
import {
  ALL_MIME_TYPES,
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from './uploads.constants';

// The response the frontend receives. `url` is always absolute (the local
// driver builds it from storage.publicBase, the S3 driver from the bucket
// base), so it can be dropped straight into <img src> / <video src> from
// the Next.js app on a different port without any origin juggling.
//
// `fileName` duplicates `name` on purpose: the pre-existing upload routes
// on CoursesController return `{ url, fileName }`, and the frontend reads
// that key. Emitting both keeps those callers working while new code can
// use the richer StoredFile shape.
export interface UploadResponse extends StoredFile {
  fileName: string;
}

function buildFileFilter(allowed: readonly string[]) {
  return (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed: ${allowed.join(', ')}`,
        ),
        false,
      );
    }
    cb(null, true);
  };
}

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private get videoMaxBytes(): number {
    return this.config.get<number>('storage.maxBytes') ?? 500 * 1024 * 1024;
  }

  private async store(file?: Express.Multer.File): Promise<UploadResponse> {
    // multer leaves `file` undefined when the multipart body carried no
    // part named "file" at all — including the common case of a client
    // that set Content-Type: multipart/form-data by hand, without the
    // boundary parameter, so nothing could be parsed out of the body.
    if (!file) {
      throw new BadRequestException(
        'No file received. Send a multipart/form-data body with a "file" field.',
      );
    }

    const stored = await this.storage.save({
      originalname: file.originalname,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    return { ...stored, fileName: stored.name };
  }

  // Generic endpoint: accepts images, video and PDFs, and reports back
  // which kind it decided the file was. This is the route the frontend
  // hits for course banners and any other one-off asset.
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES ?? 524288000) },
      fileFilter: buildFileFilter(ALL_MIME_TYPES),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    return this.store(file);
  }

  // Images only — course thumbnails, banners, avatars.
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES },
      fileFilter: buildFileFilter(IMAGE_MIME_TYPES),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    return this.store(file);
  }

  // Videos only — lecture recordings and course trailers.
  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES ?? 524288000) },
      fileFilter: buildFileFilter(VIDEO_MIME_TYPES),
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    return this.store(file);
  }

  // Documents (PDF) — worksheets and hand-outs attached to a lesson.
  @Post('document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENT_MAX_BYTES },
      fileFilter: buildFileFilter(['application/pdf']),
    }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    return this.store(file);
  }
}
