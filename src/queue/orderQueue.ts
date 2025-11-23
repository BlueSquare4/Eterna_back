import { Queue, Worker, JobsOptions } from 'bullmq';

import { logger } from '../config/logger';
import { redisClient } from './redis';
import { processOrderJob } from './orderProcessor';

const connection = redisClient;
export const orderQueueName = 'order-execution';

export const orderQueue = new Queue(orderQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export function registerWorker() {
  const worker = new Worker(
    orderQueueName,
    async (job) => processOrderJob(job),
    {
      connection,
      concurrency: 10
    }
  );
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Order job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Order job failed');
  });
  return worker;
}

export function enqueueOrder(data: Record<string, unknown>, opts?: JobsOptions) {
  return orderQueue.add('execute', data, opts);
}
