import { ConfigService } from '@nestjs/config';
import { createWriteStream, promises as fs } from 'fs';
import { join, extname, normalize } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import { StorageDriver, StoredFile, kindFor } from './storage.interface';

export class LocalDriver implements StorageDriver {
  constructor(private config: ConfigService) {}

  private dir() { return this.config.get<string>('storage.localDir')!; }

  /**
   * Keys are generated server-side, but this is the last line of defence: a
   * key that escaped its directory would let a write land anywhere on disk.
   */
  private pathFor(storageKey: string) {
    const dir = this.dir();
    const target = normalize(join(dir, storageKey));
    if (!target.startsWith(normalize(dir))) throw new Error('Refusing to write outside the storage directory.');
    return target;
  }

  urlFor(storageKey: string) {
    return `${this.config.get<string>('storage.publicBase')}/${storageKey}`;
  }

  async save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    const key = randomUUID() + extname(file.originalname);
    const target = this.pathFor(key);
    await fs.mkdir(this.dir(), { recursive: true });
    await fs.writeFile(target, file.buffer);
    return { url: this.urlFor(key), name: file.originalname, sizeBytes: file.size, kind: kindFor(file.mimetype) };
  }

  /** Streamed, so a 1 GB video is never held in the API's memory. */
  async writeStream(storageKey: string, stream: Readable): Promise<number> {
    const target = this.pathFor(storageKey);
    await fs.mkdir(join(target, '..'), { recursive: true });
    let bytes = 0;
    stream.on('data', (chunk: Buffer) => { bytes += chunk.length; });
    await pipeline(stream, createWriteStream(target));
    return bytes;
  }

  async remove(storageKey: string) {
    await fs.rm(this.pathFor(storageKey), { force: true });
  }
}
