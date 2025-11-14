import Redis from 'ioredis';

import { env, isProduction } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: isProduction } : undefined
});

export const productCacheKey = 'products:all';

export const invalidateProductCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys(`${productCacheKey}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn('Redis cache invalidate failed', error);
  }
};
