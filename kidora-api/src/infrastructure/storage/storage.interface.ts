import type { Readable } from 'stream';

export interface StoredFile { url: string; name: string; sizeBytes: number; kind: 'video' | 'document' | 'image' | 'other'; }

/** What the browser needs in order to send the bytes itself. */
export interface PresignedUpload {
  /** Where to PUT. Either the bucket directly, or this API for local disk. */
  uploadUrl: string;
  /** Headers the PUT must carry. */
  headers: Record<string, string>;
  /** True when the bytes go straight to the bucket, never through this API. */
  direct: boolean;
}

export interface StorageDriver {
  save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile>;
  /** The playback/download URL for a key already in storage. */
  urlFor(storageKey: string): string;
  /**
   * A URL the browser can PUT one object to. Undefined on drivers that cannot
   * hand out credentials-free URLs — the caller then falls back to the
   * server's own direct-PUT route.
   */
  presign?(args: { storageKey: string; mimeType: string; expiresInSec: number }): Promise<PresignedUpload>;
  /** Write a stream under a key. Used by the direct-PUT route. */
  writeStream(storageKey: string, stream: Readable): Promise<number>;
  remove(storageKey: string): Promise<void>;
}

export function kindFor(mime: string): StoredFile['kind'] {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || mime.includes('document')) return 'document';
  return 'other';
}
