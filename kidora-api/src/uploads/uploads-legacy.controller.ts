import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { detectKind, maxAnyBytes } from './upload-policy';
import { FILE_BODY, uploadOptions } from './uploads.controller';

/**
 * The same uploads under `/api/uploads`, which is what the course wizard and
 * the dashboard hooks call. Both prefixes go through UploadsService, so the
 * rules cannot drift apart — this is a second door, not a second policy.
 *
 * The bare POST is the one addition: the caller does not say what the file is
 * meant to be, so the kind is worked out from the file itself and reported
 * back as `kindDetected`.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsLegacyController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Upload any accepted file; the kind is detected' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: maxAnyBytes() },
      fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
        if (detectKind(file)) return cb(null, true);
        cb(
          new Error('That kind of file is not accepted.'),
          false,
        );
      },
    }),
  )
  any(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.storeAny(file, user.id);
  }

  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(FileInterceptor('file', uploadOptions('image')))
  image(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'image', user.id);
  }

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(FileInterceptor('file', uploadOptions('video')))
  video(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'video', user.id);
  }

  /** `document` here is the same thing this codebase calls a `file` elsewhere. */
  @Post('document')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(FileInterceptor('file', uploadOptions('file')))
  document(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'file', user.id);
  }

  @Post('subtitle')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(FileInterceptor('file', uploadOptions('subtitle')))
  subtitle(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.uploads.store(file, 'subtitle', user.id);
  }
}
