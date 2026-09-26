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
import { redisUrl } from './config/redis.config';
import { TwilioSmsProvider } from './infrastructure/sms/providers/sms-provider';
import { callbackUrlProblems, oauthCallbackUrl, oauthCredentials } from './config/oauth-callback';

// Socket.IO adapter backed by Redis pub/sub so chat + game rooms stay in
// sync across every API instance (horizontal scaling / sticky sessions).
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  async connect() {
    // Derived, so REDIS_HOST/REDIS_PORT work here too — docker-compose sets
    // those and no REDIS_URL, which used to leave this pointing at localhost.
    const url = redisUrl();
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

  // Behind Nginx / Cloudflare every request arrives from the proxy. Without
  // this, req.ip is the proxy's address — so the per-IP rate limits on OTP
  // and sign-in were shared by every visitor at once — and req.secure is
  // false even for https visitors. TRUST_PROXY is the number of proxy hops
  // (Cloudflare → Nginx = 2); it defaults to 1 in production, off otherwise.
  const hops = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '');
  if (hops) app.set('trust proxy', /^\d+$/.test(hops) ? Number(hops) : hops);

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
  reportSignInSetup();
  // Checked after listening so a slow Twilio never delays startup.
  void new TwilioSmsProvider().diagnose().then((notes) => {
    for (const n of notes) console.log(`  SMS check: ${n}`);
  });
}

/**
 * What sign-in can actually do on this machine, printed once at boot.
 *
 * "I put it in .env and it still doesn't work" is nearly always one of two
 * things, and neither is visible from the code: a social provider whose
 * redirect URI is not the one registered with the provider, or Twilio on a
 * trial account. Both are printed here with the exact value to copy, so the
 * mismatch is obvious before anyone opens a browser.
 */
function reportSignInSetup() {
  const on = (v?: string) => Boolean(v && v.trim());

  // Read through the same helper the strategies use, so this can never print
  // a URL different from the one actually sent to the provider.
  const providers = ['google', 'facebook', 'tiktok', 'github', 'microsoft', 'apple'];

  const lines: string[] = [];
  for (const name of providers) {
    const c = oauthCredentials(name);
    if (!c.id) continue;
    lines.push(`  ${name}: on — register this redirect URI with the provider, exactly:`);
    lines.push(`      ${oauthCallbackUrl(name)}`);
    for (const p of callbackUrlProblems(name)) lines.push(`    ERROR: ${p}`);
    if (!c.secret) {
      lines.push(`    WARNING: ${c.idVar} is set but ${c.secretVar} is not, so ${name} sign-in will be rejected.`);
    }
  }

  console.log('\nSign-in:');
  console.log(lines.length ? lines.join('\n') : '  Social sign-in: off (no provider client ids set)');

  const twilio = on(process.env.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_SID)
    && on(process.env.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_TOKEN)
    && on(process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM
      ?? process.env.TWILIO_SENDER_ID ?? process.env.TWILIO_MESSAGING_SERVICE_SID);

  const prod = process.env.NODE_ENV === 'production';
  console.log(
    twilio
      ? '  SMS: Twilio configured — codes are texted to the number entered. On a TRIAL account only\n'
        + '       verified numbers receive texts; any other number gets a clear "couldn\'t send" error.'
      : prod
        ? '  SMS: Twilio NOT configured — phone sign-in will answer 503 until it is.'
        : '  SMS: Twilio not configured — one-time codes are printed in this log (never sent to the browser).',
  );
  console.log(
    '  Email codes: sent through ' + (process.env.SMTP_HOST ?? 'localhost') + ':' + (process.env.SMTP_PORT ?? '1025')
      + (prod ? '' : ' — if unreachable, the code is printed in this log instead.'),
  );
  if (process.env.AUTH_TEST_EXPOSE_OTP === 'true' && !prod) {
    console.log('  AUTH_TEST_EXPOSE_OTP=true — codes are returned in API responses for the e2e suite. Never use this for real users.');
  }
  console.log(`  Web app redirected to: ${process.env.WEB_URL ?? 'http://localhost:3000'}  (set WEB_URL if that is wrong)\n`);
}
bootstrap();