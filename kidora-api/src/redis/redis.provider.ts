import Redis from 'ioredis';

export const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  },
};