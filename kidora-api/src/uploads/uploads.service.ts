import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../infrastructure/storage/storage.service';
import { StoredFile } from '../infrastructure/storage/storage.interface';
import { UploadKind, assertAllowed, detectKind, safeName } from './upload-policy';

/** What every upload route returns. */
export interface UploadResponse extends StoredFile {
  /**
   * Duplicates `name` on purpose: the older /courses/upload/* routes return
   * `{ url, fileName }` and parts of the web app read that key. Emitting both
   * lets old and new callers share one endpoint.
   */
  fileName: string;
  mimeType: string;
  uploadedBy?: string;
  /** Which kind the file was accepted as — useful to the generic route. */
  kindDetected: UploadKind;
}

/**
 * The one place a file is checked and stored, shared by both upload
 * controllers so the rules cannot drift between the route prefixes.
 */
@Injectable()
export class UploadsService {
  constructor(private storage: StorageService) {}

  async store(file: Express.Multer.File | undefined, kind: UploadKind, userId?: string) {
    // multer leaves `file` undefined when the body carried no part named
    // "file" — including a client that set multipart/form-data by hand
    // without the boundary, so nothing could be parsed out of it.
    if (!file) {
      throw new BadRequestException(
        'No file received. Send a multipart/form-data body with a "file" field.',
      );
    }

    // The interceptor's filter already ran, but a direct call must not skip it.
    assertAllowed(kind, file);
    return this.save(file, kind, userId);
  }

  /** For the generic route, which is not told what the file is meant to be. */
  async storeAny(file: Express.Multer.File | undefined, userId?: string) {
    if (!file) {
      throw new BadRequestException(
        'No file received. Send a multipart/form-data body with a "file" field.',
      );
    }
    const kind = detectKind(file);
    if (!kind) throw new BadRequestException('That kind of file is not accepted.');
    return this.save(file, kind, userId);
  }

  private async save(
    file: Express.Multer.File,
    kind: UploadKind,
    userId?: string,
  ): Promise<UploadResponse> {
    const stored = await this.storage.save({
      originalname: safeName(file.originalname),
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      ...stored,
      fileName: stored.name,
      mimeType: file.mimetype,
      kindDetected: kind,
      ...(userId ? { uploadedBy: userId } : {}),
    };
  }
}
