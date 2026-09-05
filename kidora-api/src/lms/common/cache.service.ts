import { Inject, Injectable, Optional } from '@nestjs/common';

/**
 * Small cache facade. If your app already exposes a Redis client, provide it
 * under the KIDORA_REDIS token in lms.module.ts (needs get/set/del with EX).
 * Falls back to an in-process Map so nothing breaks without Redis.
 */
export const KIDORA_REDIS = 'KIDORA_REDIS';
export interface RedisLike { get(k: string): Promise<string | null>; set(k: string, v: string, mode: 'EX', ttl: number): Promise<unknown>; del(...k: string[]): Promise<unknown>; }

@Injectable()
export class CacheService {
  private mem = new Map<string, { v: string; exp: number }>();
  constructor(@Optional() @Inject(KIDORA_REDIS) private redis?: RedisLike) {}

  async wrap<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const v = await fn();
    await this.set(key, v, ttlSec);
    return v;
  }
  async get<T>(key: string): Promise<T | null> {
    if (this.redis) { const s = await this.redis.get(key); return s ? (JSON.parse(s) as T) : null; }
    const e = this.mem.get(key); if (!e || e.exp < Date.now()) { this.mem.delete(key); return null; }
    return JSON.parse(e.v) as T;
  }
  async set(key: string, v: unknown, ttlSec: number) {
    const s = JSON.stringify(v);
    if (this.redis) await this.redis.set(key, s, 'EX', ttlSec); else this.mem.set(key, { v: s, exp: Date.now() + ttlSec * 1000 });
  }
  async del(...keys: string[]) { if (this.redis) await this.redis.del(...keys); keys.forEach((k) => this.mem.delete(k)); }
  /** Invalidate every dashboard for a user (student + their parents + teachers is done by callers). */
  userDashboardKeys(userId: string) { return [`dash:student:${userId}`, `dash:parent:${userId}`, `dash:teacher:${userId}`]; }
}
