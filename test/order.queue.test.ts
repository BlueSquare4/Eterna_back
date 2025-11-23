import { Queue, Worker } from 'bullmq';
import RedisMock from 'ioredis-mock';

import { processOrderJob } from '../src/queue/orderProcessor';
import { Order } from '../src/orders/order.model';

const redis = new (RedisMock as any)();

describe('Queue behavior', () => {
  test('processes with concurrency limit', async () => {
    const queue = new Queue('test-q', { connection: redis });
    const processed: number[] = [];
    const worker = new Worker(
      'test-q',
      async (job) => {
        processed.push(job.data.idx);
      },
      { connection: redis, concurrency: 2 }
    );
    await queue.addBulk([
      { name: 'a', data: { idx: 1 } },
      { name: 'b', data: { idx: 2 } },
      { name: 'c', data: { idx: 3 } }
    ]);
    await queue.close();
    await worker.waitUntilReady();
    await worker.close();
    expect(processed.length).toBe(3);
  });

  test('retries up to attempts then fails', async () => {
    const failingOrder: Order = {
      id: 'retry1',
      side: 'buy',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 1,
      orderType: 'market',
      status: 'pending',
      slippageBps: 1
    };
    const queue = new Queue('retry-q', { connection: redis, defaultJobOptions: { attempts: 3 } });
    const worker = new Worker(
      'retry-q',
      async (job) => {
        throw new Error('fail');
      },
      { connection: redis }
    );
    const job = await queue.add('execute', failingOrder);
    await expect(job.waitUntilFinished(redis)).rejects.toThrow();
    await queue.close();
    await worker.close();
    expect(job.attemptsMade).toBe(3);
  });
});
