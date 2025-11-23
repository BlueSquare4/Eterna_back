import WebSocket from 'ws';

import { buildServer } from '../src/server/fastify';
import { OrdersRepo } from '../src/orders/order.service';
import { publishStatus } from '../src/orders/order.statusPublisher';

async function startServer() {
  const app = buildServer();
  const address = await app.listen({ port: 0 });
  return { app, address };
}

describe('WebSocket lifecycle', () => {
  test('subscriber receives status events', async () => {
    const { app, address } = await startServer();
    const order = await OrdersRepo.create({
      id: 'ws1',
      side: 'buy',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 1,
      orderType: 'market',
      slippageBps: 50
    } as any);

    const ws = new WebSocket(address.replace('http', 'ws') + '/api/orders/execute');
    const received: any[] = [];
    await new Promise<void>((resolve) => ws.on('open', () => resolve()));
    ws.send(JSON.stringify({ type: 'subscribe', orderId: order.id }));

    ws.on('message', (data) => {
      received.push(JSON.parse(data.toString()));
    });

    await publishStatus(order.id, 'routing');
    await publishStatus(order.id, 'failed', { error: 'boom' });
    await new Promise((r) => setTimeout(r, 100));

    expect(received.some((m) => m.status === 'routing')).toBe(true);
    expect(received.some((m) => m.status === 'failed')).toBe(true);

    await ws.close();
    await app.close();
  }, 10000);
});
