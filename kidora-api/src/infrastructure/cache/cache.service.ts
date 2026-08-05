import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get('redis.host'),
      port: config.get('redis.port'),
      maxRetriesPerRequest: 3, // fail after 3 retries instead of queueing forever
      connectTimeout: 5000,    // give up connecting after 5s instead of hanging
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying, let commands fail
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttl = 60): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string): Promise<void> { await this.client.del(key); }

  async blacklist(jti: string, ttl: number) { await this.client.set('bl:' + jti, '1', 'EX', ttl); }

  // Fail open rather than hanging the whole request if Redis is down.
  // A blacklist check failing shouldn't take the entire API down with it;
  // logging the failure is more useful here than freezing every request.
  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      return (await this.client.exists('bl:' + jti)) === 1;
    } catch (err) {
      console.error('[redis] isBlacklisted check failed, failing open:', err);
      return false;
    }
  }

  async addScore(board: string, member: string, score: number) { await this.client.zadd(board, score, member); }
  async topScores(board: string, count = 10) {
    const flat = await this.client.zrevrange(board, 0, count - 1, 'WITHSCORES');
    const out: { member: string; score: number }[] = [];
    for (let i = 0; i < flat.length; i += 2) out.push({ member: flat[i], score: Number(flat[i + 1]) });
    return out;
  }

  onModuleDestroy() { this.client.quit(); }
}