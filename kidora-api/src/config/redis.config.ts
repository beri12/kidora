import { registerAs } from '@nestjs/config';

/**
 * One Redis, configured once.
 *
 * The app used to read Redis two different ways: the socket.io adapter and
 * the raw provider took REDIS_URL, while CacheService took REDIS_HOST and
 * REDIS_PORT — and only REDIS_URL was documented. Anywhere Redis is not on
 * localhost (Docker, any hosted deployment) that left the cache quietly
 * pointing at nothing, which breaks phone sign-in, the token blacklist and
 * every rate limit, because all three live in that cache.
 *
 * REDIS_URL is now the single source of truth, with REDIS_HOST / REDIS_PORT
 * kept as an override for setups that pass the parts separately.
 */
function fromUrl() {
  const raw = process.env.REDIS_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return {
      host: u.hostname || 'localhost',
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      // rediss:// means TLS, which managed Redis providers require.
      tls: u.protocol === 'rediss:',
    };
  } catch {
    // A malformed URL should not take the process down at import time; fall
    // back to the parts below and let the connection error say so.
    return null;
  }
}

/**
 * The connection string, however Redis was configured.
 *
 * Exported because main.ts (the socket.io adapter) and redis.provider.ts run
 * outside the Nest config system and used to read REDIS_URL directly — so a
 * deployment that set REDIS_HOST/REDIS_PORT instead, as docker-compose does,
 * left both of them pointing at localhost. The adapter swallows that and
 * falls back to in-memory, which silently stops chat and live games working
 * across more than one instance.
 */
export function redisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = process.env.REDIS_PORT ?? '6379';
  const user = process.env.REDIS_USERNAME ?? '';
  const pass = process.env.REDIS_PASSWORD ?? '';
  const auth = pass ? `${user}:${pass}@` : '';
  return `redis://${auth}${host}:${port}`;
}

export default registerAs('redis', () => {
  const parsed = fromUrl();
  return {
    host: process.env.REDIS_HOST ?? parsed?.host ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? parsed?.port ?? 6379),
    username: process.env.REDIS_USERNAME ?? parsed?.username,
    password: process.env.REDIS_PASSWORD ?? parsed?.password,
    tls: parsed?.tls ?? false,
    url: redisUrl(),
  };
});
