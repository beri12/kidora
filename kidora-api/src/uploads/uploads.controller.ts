import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { POLICIES, UploadKind, assertAllowed } from './upload-policy';

/** The multipart body every route here expects, for the Swagger page. */
export const FILE_BODY = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

/**
 * Builds the multer options for one kind of upload.
 *
 * `memoryStorage` is what lets these routes go through StorageService, so the
 * same request works against local disk or S3 depending on STORAGE_DRIVER —
 * the older /courses/upload/* routes write straight to disk and therefore
 * silently ignore S3. The trade-off is that the file passes through memory,
 * which is why the size ceilings are enforced by multer itself.
 */
export const uploadOptions = (kind: UploadKind) => ({
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
 * Upload endpoints at the paths the web app declares in `src/lib/api.ts`
 * (`/media/upload/image|video|file|subtitle`).
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
  constructor(private uploads: UploadsService) {}

  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Upload an image (jpg, png, webp, gif, avif · max 10MB)' })
  @UseInterceptors(FileInterceptor('file', uploadOptions('image')))
  image(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'image', user.id);
  }

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Upload a video (mp4, webm, mov, mkv · max UPLOAD_MAX_BYTES)' })
  @UseInterceptors(FileInterceptor('file', uploadOptions('video')))
  video(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'video', user.id);
  }

  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Upload a document (pdf, office, txt, csv, zip · max 50MB)' })
  @UseInterceptors(FileInterceptor('file', uploadOptions('file')))
  file(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'file', user.id);
  }

  @Post('subtitle')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Upload subtitles (vtt, srt · max 2MB)' })
  @UseInterceptors(FileInterceptor('file', uploadOptions('subtitle')))
  subtitle(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'subtitle', user.id);
  }
}
