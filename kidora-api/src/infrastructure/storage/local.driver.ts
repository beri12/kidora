import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { StorageDriver, StoredFile, kindFor } from './storage.interface';

export class LocalDriver implements StorageDriver {
  constructor(private config: ConfigService) {}
  async save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    const dir = this.config.get<string>('storage.localDir')!;
    await fs.mkdir(dir, { recursive: true });
    const filename = randomUUID() + extname(file.originalname);
    await fs.writeFile(join(dir, filename), file.buffer);
    return { url: this.config.get<string>('storage.publicBase') + '/' + filename, name: file.originalname, sizeBytes: file.size, kind: kindFor(file.mimetype) };
  }
}
