import { buildServer } from '../src/server/fastify';

vi.mock('../src/queue/orderQueue', () => ({
  enqueueOrder: vi.fn(),
  registerWorker: vi.fn()
}));
vi.mock('../src/queue/orderProcessor', () => ({
  submitNewOrder: vi.fn()
}));

const app = buildServer();

describe('Order submission API', () => {
  test('returns orderId for valid payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/orders/execute',
      payload: {
        side: 'buy',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
        orderType: 'market',
        slippageBps: 50
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.orderId).toBeDefined();
  });

  test('rejects invalid payload', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/orders/execute', payload: {} });
    expect(response.statusCode).toBe(400);
  });
});
