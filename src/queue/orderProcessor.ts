import { Job } from 'bullmq';
import { logger } from '../config/logger';
import { MockDexRouter } from '../dex/MockDexRouter';
import { Order } from '../orders/order.model';
import { publishStatus, updateOrderFinal } from '../orders/order.statusPublisher';
import { OrdersRepo } from '../orders/order.service';

const router = new MockDexRouter();

export async function processOrderJob(job: Job) {
  const order = job.data as Order;
  try {
    await publishStatus(order.id, 'routing');
    const decision = await router.route(order);

    await publishStatus(order.id, 'building', { dex: decision.dex, quote: decision.quote });

    await publishStatus(order.id, 'submitted', { dex: decision.dex });

    const result = await router.executeSwap(decision.dex, order, decision.quote);

    await updateOrderFinal(order.id, 'confirmed', {
      selectedDex: decision.dex,
      executedPrice: result.executedPrice,
      txHash: result.txHash,
      errorReason: undefined
    });
    return result;
  } catch (err: any) {
    logger.error({ err }, 'Processing failed');
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      await updateOrderFinal(order.id, 'failed', { errorReason: err?.message });
    } else {
      await publishStatus(order.id, 'failed', { error: err?.message, retrying: true });
      throw err;
    }
  }
}

export async function submitNewOrder(order: Order) {
  await OrdersRepo.create(order);
  await publishStatus(order.id, 'pending');
}
