import { CacheService } from './cache.service';

// A host that never resolves, like "redis" outside Docker.
const config: any = { get: (k: string) => ({ 'redis.host': 'redis.invalid', 'redis.port': 6379 } as Record<string, unknown>)[k] };

describe('CacheService without Redis (development)', () => {
  const env = process.env.NODE_ENV;
  let cache: CacheService;
  beforeAll(() => { process.env.NODE_ENV = 'development'; cache = new CacheService(config); });
  afterAll(() => { cache.onModuleDestroy(); process.env.NODE_ENV = env; });

  it('keeps working in memory: values, TTLs, counters, blacklist', async () => {
    await cache.set('otp:x', { hash: 'h' }, 300);
    expect(await cache.get('otp:x')).toEqual({ hash: 'h' });
    expect(await cache.ttl('otp:x')).toBeGreaterThan(290);
    expect(await cache.incrWithTtl('sends:x', 3600)).toBe(1);
    expect(await cache.incrWithTtl('sends:x', 3600)).toBe(2);
    await cache.del('otp:x');
    expect(await cache.get('otp:x')).toBeNull();
    await cache.blacklist('jti1', 60);
    expect(await cache.isBlacklisted('jti1')).toBe(true);
    await cache.addScore('board', 'a', 5); await cache.addScore('board', 'b', 9);
    expect(await cache.topScores('board')).toEqual([{ member: 'b', score: 9 }, { member: 'a', score: 5 }]);
  });
});
