import IORedis from 'ioredis';
import RedisMock from 'ioredis-mock';

import { env } from '../config/env';

const useMock = env.nodeEnv === 'test';
export const redisClient = useMock ? new (RedisMock as any)() : new IORedis(env.redisUrl);
