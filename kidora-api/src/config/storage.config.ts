import { registerAs } from '@nestjs/config';

const int = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};
const list = (v: string | undefined, fallback: string[]) => {
  const parts = (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
};

export default registerAs('storage', () => ({
  driver: process.env.STORAGE_DRIVER ?? 'local',
  localDir: process.env.STORAGE_DIR ?? './uploads',
  publicBase: process.env.STORAGE_PUBLIC_BASE ?? 'http://localhost:4000/uploads',
  maxBytes: int(process.env.UPLOAD_MAX_BYTES, 524288000),

  video: {
    // Deployment decides the ceiling; nothing here is a production limit.
    maxBytes: int(process.env.VIDEO_MAX_SIZE_MB, 1024) * 1024 * 1024,
    allowedTypes: list(process.env.VIDEO_ALLOWED_TYPES, [
      'video/mp4', 'video/quicktime', 'video/webm',
    ]),
    /** How long a presigned upload URL stays usable. */
    uploadTtlSec: int(process.env.VIDEO_UPLOAD_TTL_SEC, 6 * 60 * 60),
    /** Share of a video that counts as watched. */
    completionPercent: Math.min(100, int(process.env.VIDEO_COMPLETION_PERCENT, 90)),
  },
}));
