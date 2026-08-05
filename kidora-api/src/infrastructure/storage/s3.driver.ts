import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { StorageDriver, StoredFile, kindFor } from './storage.interface';

// S3/R2/Spaces driver. Requires: npm i @aws-sdk/client-s3
// Env: S3_BUCKET, S3_REGION, S3_ENDPOINT?, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE
export class S3Driver implements StorageDriver {
  private client: any;
  private bucket: string;
  constructor(private config: ConfigService) {
    const { S3Client } = require('@aws-sdk/client-s3');
    this.bucket = process.env.S3_BUCKET!;
    this.client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
    });
  }
  async save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile> {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const key = 'uploads/' + randomUUID() + extname(file.originalname);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, ACL: 'public-read' }));
    const base = process.env.S3_PUBLIC_BASE || (process.env.S3_ENDPOINT + '/' + this.bucket);
    return { url: base + '/' + key, name: file.originalname, sizeBytes: file.size, kind: kindFor(file.mimetype) };
  }
}
