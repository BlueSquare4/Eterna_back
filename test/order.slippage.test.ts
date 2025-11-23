import { MockDexRouter } from '../src/dex/MockDexRouter';
import { Order } from '../src/orders/order.model';

describe('Slippage protection', () => {
  test('fails when slippage exceeded', async () => {
    const router = new MockDexRouter();
    const order: Order = {
      id: 'o2',
      side: 'buy',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 1,
      orderType: 'market',
      status: 'pending',
      slippageBps: 10
    };
    const quote = { dex: 'RAYDIUM', price: 10, feeBps: 30 } as const;
    vi.spyOn(router as any, 'basePrice', 'get').mockReturnValue(10);
    await expect(router.executeSwap('RAYDIUM', order, quote)).rejects.toThrow(/Slippage/);
  });
});
