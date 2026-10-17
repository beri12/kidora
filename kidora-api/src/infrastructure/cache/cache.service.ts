import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Minimal in-process stand-in for the Redis commands this service uses.
 * Development only: it lives in one process and is lost on restart, which is
 * fine on a laptop and wrong for production (several instances, restarts).
 */
class MemoryStore {
  private values = new Map<string, { v: string; exp: number }>();
  private boards = new Map<string, Map<string, number>>();

  private live(key: string) {
    const e = this.values.get(key);
    if (e && e.exp > Date.now()) return e;
    this.values.delete(key);
    return null;
  }
  get(key: string) { return this.live(key)?.v ?? null; }
  set(key: string, v: string, ttl: number) { this.values.set(key, { v, exp: ttl > 0 ? Date.now() + ttl * 1000 : Infinity }); }
  del(key: string) { this.values.delete(key); this.boards.delete(key); }
  exists(key: string) { return this.live(key) ? 1 : 0; }
  ttl(key: string) {
    const e = this.live(key);
    if (!e) return -2;
    return e.exp === Infinity ? -1 : Math.ceil((e.exp - Date.now()) / 1000);
  }
  incr(key: string) {
    const e = this.live(key);
    const n = (e ? Number(e.v) : 0) + 1;
    this.values.set(key, { v: String(n), exp: e?.exp ?? Infinity });
    return n;
  }
  expire(key: string, ttl: number) { const e = this.live(key); if (e) e.exp = Date.now() + ttl * 1000; }
  zadd(board: string, score: number, member: string) {
    if (!this.boards.has(board)) this.boards.set(board, new Map());
    this.boards.get(board)!.set(member, score);
  }
  zrevrange(board: string, count: number) {
    return [...(this.boards.get(board) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([member, score]) => ({ member, score }));
  }
}

/** Errors that mean "Redis is not there", as opposed to a bad command. */
function isConnectionError(err: unknown) {
  const e = err as { code?: string; message?: string };
  return ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNRESET'].includes(e?.code ?? '')
    || /Connection is closed|Stream isn't writeable|enableOfflineQueue|max retries/i.test(e?.message ?? '');
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  readonly client: Redis;
  private logger = new Logger('Redis');
  private readonly production = process.env.NODE_ENV === 'production';
  /** Set when Redis is unreachable in development: everything runs in memory. */
  private memory: MemoryStore | null = null;
  private lastErrorLog = 0;

  constructor(config: ConfigService) {
    const host = config.get<string>('redis.host');
    const port = config.get<number>('redis.port');
    this.client = new Redis({
      host,
      port,
      username: config.get('redis.username'),
      password: config.get('redis.password'),
      // Managed Redis (rediss://) refuses plaintext connections.
      ...(config.get('redis.tls') ? { tls: {} } : {}),
      connectTimeout: 5000,
      // While Redis is down, fail commands at once instead of queueing them.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      // Keep reconnecting (a Redis restart must not need an API restart),
      // backing off to one attempt every 10 seconds.
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });

    this.client.on('ready', () => {
      if (this.lastErrorLog) this.logger.log(`Connected to ${host}:${port}.`);
      this.lastErrorLog = 0;
    });
    this.client.on('error', (err: Error & { code?: string }) => {
      if (!this.production && !this.memory && isConnectionError(err)) {
        this.useMemory(host, err);
        return;
      }
      // One line every 30s, not one per retry.
      if (Date.now() - this.lastErrorLog < 30_000) return;
      this.lastErrorLog = Date.now();
      this.logger.error(`Cannot reach Redis at ${host}:${port} (${err.code ?? err.message}).${CacheService.hint(host)}`);
    });
  }

  private static hint(host?: string) {
    return host === 'redis'
      ? ' "redis" is the Docker Compose service name and only resolves inside Docker; outside it set REDIS_URL=redis://localhost:6379.'
      : '';
  }

  private useMemory(host: string | undefined, err: Error & { code?: string }) {
    this.memory = new MemoryStore();
    this.client.disconnect(); // stop the reconnect loop and its log noise
    this.logger.warn(
      `Redis unreachable (${err.code ?? err.message}); using an in-memory cache for this development run.` +
      `${CacheService.hint(host)} Start Redis and restart the API to use it.`,
    );
  }

  /** Runs on Redis, or on the in-memory store in development when Redis is missing. */
  private async run<T>(onRedis: () => Promise<T>, onMemory: (m: MemoryStore) => T): Promise<T> {
    if (this.memory) return onMemory(this.memory);
    try {
      return await onRedis();
    } catch (err) {
      if (!isConnectionError(err)) throw err;
      if (!this.production) {
        if (!this.memory) this.useMemory(undefined, err as Error);
        return onMemory(this.memory!);
      }
      // A clear 503 instead of "Connection is closed" as a 500.
      throw new ServiceUnavailableException('This service is temporarily unavailable. Please try again in a minute.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.run(() => this.client.get(key), (m) => m.get(key));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttl = 60): Promise<void> {
    const raw = JSON.stringify(value);
    await this.run(async () => { await this.client.set(key, raw, 'EX', ttl); }, (m) => m.set(key, raw, ttl));
  }

  async del(key: string): Promise<void> {
    await this.run(async () => { await this.client.del(key); }, (m) => m.del(key));
  }

  /** Seconds left on a key, or 0 when it has no TTL / does not exist. */
  async ttl(key: string): Promise<number> {
    const t = await this.run(() => this.client.ttl(key), (m) => m.ttl(key));
    return t > 0 ? t : 0;
  }

  /**
   * Atomic counter with an expiry set on first write — the building block for
   * "at most N OTP requests per hour" style limits. Returns the new count.
   */
  async incrWithTtl(key: string, ttl: number): Promise<number> {
    return this.run(
      async () => {
        const count = await this.client.incr(key);
        if (count === 1) await this.client.expire(key, ttl);
        return count;
      },
      (m) => {
        const count = m.incr(key);
        if (count === 1) m.expire(key, ttl);
        return count;
      },
    );
  }

  async blacklist(jti: string, ttl: number) {
    await this.run(async () => { await this.client.set('bl:' + jti, '1', 'EX', ttl); }, (m) => m.set('bl:' + jti, '1', ttl));
  }

  /**
   * Drop a user's cached tenancy (role / schoolId / districtId / active).
   *
   * JwtStrategy caches these for a minute because it reads them on every
   * authenticated request. Call this after moving a user between schools,
   * changing their role, or disabling them, so the change takes effect at once
   * instead of at the end of the TTL.
   */
  async bustTenancy(userId: string) {
    try {
      await this.del('tenancy:' + userId);
    } catch (err) {
      // Worst case the change is visible a minute later; never fail the write.
      this.logger.error(`bustTenancy failed: ${(err as Error).message}`);
    }
  }

  // Fail open rather than hanging the whole request if Redis is down.
  // A blacklist check failing shouldn't take the entire API down with it;
  // logging the failure is more useful here than freezing every request.
  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      return (await this.run(() => this.client.exists('bl:' + jti), (m) => m.exists('bl:' + jti))) === 1;
    } catch (err) {
      this.logger.error(`isBlacklisted check failed, failing open: ${(err as Error).message}`);
      return false;
    }
  }

  async addScore(board: string, member: string, score: number) {
    await this.run(async () => { await this.client.zadd(board, score, member); }, (m) => m.zadd(board, score, member));
  }

  async topScores(board: string, count = 10) {
    return this.run(
      async () => {
        const flat = await this.client.zrevrange(board, 0, count - 1, 'WITHSCORES');
        const out: { member: string; score: number }[] = [];
        for (let i = 0; i < flat.length; i += 2) out.push({ member: flat[i], score: Number(flat[i + 1]) });
        return out;
      },
      (m) => m.zrevrange(board, count),
    );
  }

  onModuleDestroy() {
    if (this.client.status === 'ready') void this.client.quit();
    else this.client.disconnect();
  }
}
