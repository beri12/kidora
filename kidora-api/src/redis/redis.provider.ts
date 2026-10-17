import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { redisUrl } from '../config/redis.config';

export const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    // Connects on first use only: nothing reads this client yet, and an idle
    // client that cannot reach Redis would otherwise log on every retry.
    const client = new Redis(redisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });
    const logger = new Logger('Redis');
    let last = 0;
    client.on('error', (err: Error & { code?: string }) => {
      if (Date.now() - last < 30_000) return;
      last = Date.now();
      logger.error(`REDIS_CLIENT: ${err.code ?? err.message}`);
    });
    return client;
  },
};
