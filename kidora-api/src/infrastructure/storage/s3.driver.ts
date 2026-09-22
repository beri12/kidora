import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { PresignedUpload, StorageDriver, StoredFile, kindFor } from './storage.interface';
import { presignGet, presignPut, signedHeaders, type S3Config } from './sigv4';

/**
 * S3-compatible storage (AWS, R2, Spaces, MinIO) over plain fetch and a local
 * SigV4 implementation, so no SDK is required. Env: STORAGE_ENDPOINT,
 * STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY,
 * STORAGE_PUBLIC_BASE.
 */
export class S3Driver implements StorageDriver {
  private cfg: S3Config;

  constructor(private config: ConfigService) {
    const endpoint = process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT || undefined;
    this.cfg = {
      endpoint,
      region: process.env.STORAGE_REGION || process.env.S3_REGION || 'us-east-1',
      bucket: process.env.STORAGE_BUCKET || process.env.S3_BUCKET || '',
      accessKey: process.env.STORAGE_ACCESS_KEY || process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.STORAGE_SECRET_KEY || process.env.S3_SECRET_KEY || '',
      // Path-style unless told otherwise: it is what every S3 clone accepts.
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE
        ? process.env.STORAGE_FORCE_PATH_STYLE === 'true'
        : Boolean(endpoint),
    };
    for (const k of ['bucket', 'accessKey', 'secretKey'] as const) {
      if (!this.cfg[k]) throw new Error(`STORAGE_DRIVER=s3 needs STORAGE_${k === 'bucket' ? 'BUCKET' : k === 'accessKey' ? 'ACCESS_KEY' : 'SECRET_KEY'}.`);
    }
  }

  urlFor(storageKey: string) {
    const base = process.env.STORAGE_PUBLIC_BASE || process.env.S3_PUBLIC_BASE;
    if (base) return `${base.replace(/\/$/, '')}/${storageKey}`;
    // No public base configured means the bucket is private; hand out a
    // time-limited read URL rather than a link that 403s.
    return presignGet(this.cfg, storageKey, Number(process.env.STORAGE_SIGNED_READ_TTL_SEC ?? 21600));
  }

  async presign({ storageKey, mimeType, expiresInSec }: { storageKey: string; mimeType: string; expiresInSec: number }): Promise<PresignedUpload> {
    return {
      uploadUrl: presignPut(this.cfg, storageKey, expiresInSec),
      headers: { 'Content-Type': mimeType },
      direct: true,
    };
  }

  async save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    const key = 'uploads/' + randomUUID() + extname(file.originalname);
    const { url, headers } = signedHeaders(this.cfg, 'PUT', key, file.buffer, file.mimetype);
    const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(file.buffer) });
    if (!res.ok) throw new Error(`Storage rejected the upload (${res.status}).`);
    return { url: this.urlFor(key), name: file.originalname, sizeBytes: file.size, kind: kindFor(file.mimetype) };
  }

  /**
   * Only used when a client cannot presign. Buffers, because a single-shot
   * signed PUT needs the payload hash up front; the presigned path above is
   * what large videos actually take.
   */
  async writeStream(storageKey: string, stream: Readable): Promise<number> {
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.from(c));
    const body = Buffer.concat(chunks);
    const { url, headers } = signedHeaders(this.cfg, 'PUT', storageKey, body);
    const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(body) });
    if (!res.ok) throw new Error(`Storage rejected the upload (${res.status}).`);
    return body.length;
  }

  async remove(storageKey: string) {
    const { url, headers } = signedHeaders(this.cfg, 'DELETE', storageKey, null);
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) throw new Error(`Storage refused the delete (${res.status}).`);
  }
}
