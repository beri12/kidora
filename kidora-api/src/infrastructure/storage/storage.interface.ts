export interface StoredFile { url: string; name: string; sizeBytes: number; kind: 'video' | 'document' | 'image' | 'other'; }
export interface StorageDriver { save(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }): Promise<StoredFile>; }

export function kindFor(mime: string): StoredFile['kind'] {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || mime.includes('document')) return 'document';
  return 'other';
}
