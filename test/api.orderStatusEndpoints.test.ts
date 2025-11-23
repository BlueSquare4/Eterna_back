import { vi, describe, test, expect, beforeEach } from 'vitest';
import { buildServer } from '../src/server/fastify';

const mockGetOrder = vi.fn();
const mockGetStatusEvents = vi.fn();

vi.mock('../src/orders/order.service', () => ({
  OrdersRepo: {
    getOrder: (...args: unknown[]) => mockGetOrder(...args),
    getStatusEvents: (...args: unknown[]) => mockGetStatusEvents(...args)
  }
}));

const app = buildServer();

describe('Order inspection endpoints', () => {
  beforeEach(() => {
    mockGetOrder.mockReset();
    mockGetStatusEvents.mockReset();
  });

  test('returns order payload when found', async () => {
    mockGetOrder.mockResolvedValue({ id: 'abc', side: 'buy' });
    const response = await app.inject({ method: 'GET', url: '/api/orders/abc' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'abc', side: 'buy' });
  });

  test('returns 404 when order is missing', async () => {
    mockGetOrder.mockResolvedValue(undefined);
    const response = await app.inject({ method: 'GET', url: '/api/orders/missing' });
    expect(response.statusCode).toBe(404);
  });

  test('returns status events', async () => {
    mockGetOrder.mockResolvedValue({ id: 'abc', side: 'buy' });
    mockGetStatusEvents.mockResolvedValue([
      { id: '1', order_id: 'abc', status: 'pending', payload: {} },
      { id: '2', order_id: 'abc', status: 'confirmed', payload: {} }
    ]);
    const response = await app.inject({ method: 'GET', url: '/api/orders/abc/events' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.orderId).toBe('abc');
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toHaveLength(2);
  });
});
