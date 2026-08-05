import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageDriver, StoredFile } from './storage.interface';
import { LocalDriver } from './local.driver';
import { S3Driver } from './s3.driver';

// Picks the driver from STORAGE_DRIVER ('local' | 's3'). Same API either way.
@Injectable()
export class StorageService {
  private driver: StorageDriver;
  constructor(private config: ConfigService) {
    this.driver = config.get('storage.driver') === 's3' ? new S3Driver(config) : new LocalDriver(config);
  }
  save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    return this.driver.save(file);
  }
}
