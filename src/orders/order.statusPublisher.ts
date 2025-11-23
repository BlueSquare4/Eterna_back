import { v4 as uuid } from 'uuid';

import { logger } from '../config/logger';
import { OrdersRepo } from './order.service';
import { DexName, OrderStatus, OrderStatusEvent } from './order.model';
import { wsManager } from '../ws/wsManager';
import { redisClient } from '../queue/redis';

export async function publishStatus(
  orderId: string,
  status: OrderStatus,
  payload?: Record<string, unknown>
) {
  const event: OrderStatusEvent = { id: uuid(), orderId, status, payload };
  await OrdersRepo.addStatusEvent(event);
  logger.info({ orderId, status, payload }, 'Status event');
  if (redisClient) {
    await redisClient.hset(`order:${orderId}`, {
      status,
      payload: JSON.stringify(payload || {}),
      updatedAt: new Date().toISOString()
    });
  }
  wsManager.broadcast(orderId, {
    orderId,
    status,
    timestamp: new Date().toISOString(),
    payload
  });
}

export async function updateOrderFinal(
  orderId: string,
  status: OrderStatus,
  options?: {
    selectedDex?: DexName;
    executedPrice?: number;
    txHash?: string;
    errorReason?: string;
  }
) {
  await OrdersRepo.updateStatus(orderId, status, options);
  await publishStatus(orderId, status, options as Record<string, unknown>);
}
