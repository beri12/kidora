import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
import { PresignedUpload, StorageDriver, StoredFile } from './storage.interface';
import { LocalDriver } from './local.driver';
import { S3Driver } from './s3.driver';

// Picks the driver from STORAGE_DRIVER ('local' | 's3'). Same API either way.
@Injectable()
export class StorageService {
  private driver: StorageDriver;
  readonly isDirect: boolean;

  constructor(private config: ConfigService) {
    const s3 = config.get('storage.driver') === 's3';
    this.driver = s3 ? new S3Driver(config) : new LocalDriver(config);
    this.isDirect = s3;
  }

  save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    return this.driver.save(file);
  }
  urlFor(storageKey: string) { return this.driver.urlFor(storageKey); }
  writeStream(storageKey: string, stream: Readable) { return this.driver.writeStream(storageKey, stream); }
  remove(storageKey: string) { return this.driver.remove(storageKey); }

  /** Undefined when the driver cannot issue one; the caller falls back. */
  presign(args: { storageKey: string; mimeType: string; expiresInSec: number }): Promise<PresignedUpload> | undefined {
    return this.driver.presign?.(args);
  }
}
