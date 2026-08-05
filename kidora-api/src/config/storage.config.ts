import { registerAs } from '@nestjs/config';
export default registerAs('storage', () => ({
  driver: process.env.STORAGE_DRIVER ?? 'local',
  localDir: process.env.STORAGE_DIR ?? './uploads',
  publicBase: process.env.STORAGE_PUBLIC_BASE ?? 'http://localhost:4000/uploads',
  maxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 524288000),
}));
