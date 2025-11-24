// src/queue/redis.ts
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,   // REQUIRED FOR BULLMQ
  enableAutoPipelining: true,   // optional, improves performance
});

export default redisClient;
