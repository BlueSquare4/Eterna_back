import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { enqueueOrder } from '../../queue/orderQueue';
import { submitNewOrder } from '../../queue/orderProcessor';
import { OrdersRepo } from '../../orders/order.service';
import { Order } from '../../orders/order.model';
import { wsManager } from '../../ws/wsManager';
import { redisClient } from '../../queue/redis';

const orderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.number(),
  orderType: z.literal('market'),
  slippageBps: z.number().optional().default(50)
});

async function ordersRoute(fastify: FastifyInstance) {
  fastify.post('/execute', async (request, reply) => {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const payload = parsed.data;
    const orderId = uuid();
    const order: Order = {
      id: orderId,
      side: payload.side,
      tokenIn: payload.tokenIn,
      tokenOut: payload.tokenOut,
      amountIn: payload.amountIn,
      orderType: 'market',
      status: 'pending',
      slippageBps: payload.slippageBps
    };

    await submitNewOrder(order);
    await enqueueOrder(order);

    return reply.status(200).send({ orderId });
  });

  fastify.get('/execute', { websocket: true }, async (connection) => {
    connection.socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && msg.orderId) {
          const existing = await OrdersRepo.getOrder(msg.orderId);
          if (!existing) {
            connection.socket.send(
              JSON.stringify({ error: 'Order not found', orderId: msg.orderId })
            );
            connection.socket.close();
            return;
          }
          wsManager.addSubscriber(msg.orderId, connection.socket);
          if (redisClient) {
            const snapshot = await redisClient.hgetall(`order:${msg.orderId}`);
            if (snapshot?.status) {
              connection.socket.send(
                JSON.stringify({
                  orderId: msg.orderId,
                  status: snapshot.status,
                  timestamp: snapshot.updatedAt,
                  payload: snapshot.payload ? JSON.parse(snapshot.payload) : undefined
                })
              );
            }
          }
        }
      } catch (err) {
        connection.socket.send(JSON.stringify({ error: 'Bad message format' }));
      }
    });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await OrdersRepo.getOrder(id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    return reply.send(order);
  });

  fastify.get('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await OrdersRepo.getOrder(id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    const events = await OrdersRepo.getStatusEvents(id);
    return reply.send({ orderId: id, events });
  });
}

export default ordersRoute;
