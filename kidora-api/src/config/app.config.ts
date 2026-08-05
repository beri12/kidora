import { registerAs } from '@nestjs/config';
export default registerAs('app', () => ({
  port: Number(process.env.PORT ?? 4000),
  env: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
}));
