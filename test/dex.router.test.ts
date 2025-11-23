import { MockDexRouter } from '../src/dex/MockDexRouter';
import { Order } from '../src/orders/order.model';

const baseOrder: Order = {
  id: 'o1',
  side: 'buy',
  tokenIn: 'SOL',
  tokenOut: 'USDC',
  amountIn: 1,
  orderType: 'market',
  status: 'pending',
  slippageBps: 50
};

describe('MockDexRouter routing', () => {
  test('chooses lower price for buy', async () => {
    const router = new MockDexRouter();
    vi.spyOn(router, 'getRaydiumQuote').mockResolvedValue({ dex: 'RAYDIUM', price: 10, feeBps: 30 });
    vi.spyOn(router, 'getMeteoraQuote').mockResolvedValue({ dex: 'METEORA', price: 11, feeBps: 25 });
    const decision = await router.route({ ...baseOrder, side: 'buy' });
    expect(decision.dex).toBe('RAYDIUM');
  });

  test('chooses higher price for sell', async () => {
    const router = new MockDexRouter();
    vi.spyOn(router, 'getRaydiumQuote').mockResolvedValue({ dex: 'RAYDIUM', price: 10, feeBps: 30 });
    vi.spyOn(router, 'getMeteoraQuote').mockResolvedValue({ dex: 'METEORA', price: 11, feeBps: 25 });
    const decision = await router.route({ ...baseOrder, side: 'sell' });
    expect(decision.dex).toBe('METEORA');
  });
});
