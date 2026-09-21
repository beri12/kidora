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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StorageService } from '../infrastructure/storage/storage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { POLICIES, UploadKind, assertAllowed, safeName } from './upload-policy';

/**
 * Builds the multer options for one kind of upload.
 *
 * `memoryStorage` is what lets these routes go through StorageService, so the
 * same request works against local disk or S3 depending on STORAGE_DRIVER —
 * the older /courses/upload/* routes write straight to disk and therefore
 * silently ignore S3. The trade-off is that the file passes through memory,
 * which is why the size ceilings below are enforced by multer itself and not
 * only after the fact.
 */
const options = (kind: UploadKind) => ({
  storage: memoryStorage(),
  limits: { files: 1, fileSize: POLICIES[kind].maxBytes },
  // Rejecting here means a wrong-typed file is refused while it streams,
  // instead of being buffered in full and thrown away afterwards. Exceeding
  // `fileSize` is Nest's to report: its FileInterceptor already turns multer's
  // LIMIT_FILE_SIZE into a 413, so there is no error mapping to write here.
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    try {
      assertAllowed(kind, file);
      cb(null, true);
    } catch (e) {
      cb(e, false);
    }
  },
});

/**
 * Generic upload endpoints, mounted at the paths the web app already declares
 * in `src/lib/api.ts` (`/media/upload/image|video|file|subtitle`).
 *
 * Any signed-in user may upload: students attach files to assignment
 * submissions, teachers attach lesson material. What a file may be, and how
 * big, is decided per route in `upload-policy.ts`.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media/upload')
export class UploadsController {
  constructor(private storage: StorageService) {}

  private async store(file: Express.Multer.File, kind: UploadKind, user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded');

    // The filter already ran, but a direct call must not be able to skip it.
    assertAllowed(kind, file);

    const stored = await this.storage.save({
      originalname: safeName(file.originalname),
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      ...stored,
      // `fileName` mirrors what /courses/upload/* returns, so either endpoint
      // can be swapped in without touching the caller.
      fileName: stored.name,
      mimeType: file.mimetype,
      uploadedBy: user.id,
    };
  }

  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (jpg, png, webp, gif, avif · max 10MB)' })
  @UseInterceptors(FileInterceptor('file', options('image')))
  image(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.store(file, 'image', user);
  }

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video (mp4, webm, mov, mkv · max UPLOAD_MAX_BYTES)' })
  @UseInterceptors(FileInterceptor('file', options('video')))
  video(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.store(file, 'video', user);
  }

  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (pdf, office, txt, csv, zip · max 50MB)' })
  @UseInterceptors(FileInterceptor('file', options('file')))
  file(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.store(file, 'file', user);
  }

  @Post('subtitle')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload subtitles (vtt, srt · max 2MB)' })
  @UseInterceptors(FileInterceptor('file', options('subtitle')))
  subtitle(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.store(file, 'subtitle', user);
  }
}
