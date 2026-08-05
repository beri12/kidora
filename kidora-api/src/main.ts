import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Socket.IO adapter backed by Redis pub/sub so chat + game rooms stay in
// sync across every API instance (horizontal scaling / sticky sessions).
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  async connect() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.adapterConstructor = createAdapter(pub, sub);
  }
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}

async function bootstrap() {
  // NestExpressApplication (instead of the default NestApplication) is
  // required for useStaticAssets below, which serves uploaded files.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Ensures NestJS runs onModuleDestroy (and therefore PrismaService's
  // $disconnect()) on shutdown/restart. Without this, Prisma connections
  // from previous dev-server restarts can pile up in Postgres over a long
  // session, eventually exhausting the pool and causing new queries to
  // hang indefinitely waiting for a free connection.
  app.enableShutdownHooks();

  // Express's body parser defaults to a 100KB limit. Raised here to
  // accommodate any remaining JSON payloads with embedded data; most large
  // uploads now go through the dedicated multipart endpoints below instead.
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  // Serves everything in /uploads at http://localhost:4000/uploads/...
  // so the URLs returned by the upload endpoints (courses.controller.ts)
  // are directly usable as <video src> / <img src> on the frontend.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');

  // If CORS_ORIGIN is set (comma-separated), use that explicit allow-list.
  // Otherwise fall back to `true`, which reflects whatever origin made the
  // request. This matters because `origin: '*'.split(',')` (the old code)
  // produces `['*']`, and the cors package treats an array as a literal
  // allow-list — it does NOT expand '*' as a wildcard inside an array, so
  // every real browser origin fails to match and every request gets
  // silently blocked before it reaches any controller. `true` is also
  // required here (rather than a literal '*' string) because the CORS spec
  // disallows the wildcard origin whenever credentials: true is set.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : true,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Attach the Redis Socket.IO adapter (falls back to in-memory if Redis is down).
  const ioAdapter = new RedisIoAdapter(app);
  try { await ioAdapter.connect(); app.useWebSocketAdapter(ioAdapter); }
  catch { console.warn('Redis adapter unavailable — using in-memory Socket.IO'); }

  const config = new DocumentBuilder()
    .setTitle('Kidora Education Platform API')
    .setDescription('AI-powered learning ecosystem for children, parents, teachers, schools, and districts.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Kidora API running on http://localhost:${port}/api  (docs: /api/docs)`);
}
bootstrap();