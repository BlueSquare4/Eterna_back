import { OrdersRepo } from '../src/orders/order.service';
import { publishStatus } from '../src/orders/order.statusPublisher';
import { db } from '../src/db/client';

describe('Order status persistence', () => {
  test('status events stored in db', async () => {
    const order = await OrdersRepo.create({
      id: 'status1',
      side: 'buy',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 1,
      orderType: 'market',
      slippageBps: 50
    } as any);
    await publishStatus(order.id, 'routing');
    const res = await db.query('SELECT * FROM order_status_events WHERE order_id=$1', [order.id]);
    expect(res.rows.length).toBeGreaterThan(0);
  });
});
