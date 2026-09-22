import Redis from 'ioredis';
import { redisUrl } from '../config/redis.config';

export const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    return new Redis(redisUrl());
  },
};