import { randomUUID } from 'crypto';

import { logger } from '../config/logger';
import { DexName, DexQuote, ExecuteResult, Order } from '../orders/order.model';

function randomDelay(min: number, max: number) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomVariance(base: number, variancePct: number) {
  const change = base * (variancePct / 100);
  const delta = (Math.random() * change * 2 - change) as number;
  return base + delta;
}

export class MockDexRouter {
  basePrice = 20;

  async getRaydiumQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DexQuote> {
    await randomDelay(200, 300);
    const price = randomVariance(this.basePrice, 4);
    return { dex: 'RAYDIUM', price, feeBps: 30 };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DexQuote> {
    await randomDelay(200, 300);
    const price = randomVariance(this.basePrice * 1.01, 4.5);
    return { dex: 'METEORA', price, feeBps: 25 };
  }

  async route(order: Order): Promise<{ dex: DexName; quote: DexQuote }> {
    const [ray, met] = await Promise.all([
      this.getRaydiumQuote(order.tokenIn, order.tokenOut, order.amountIn),
      this.getMeteoraQuote(order.tokenIn, order.tokenOut, order.amountIn)
    ]);

    let choice: DexQuote = ray;
    if (order.side === 'buy') {
      choice = ray.price <= met.price ? ray : met;
    } else {
      choice = ray.price >= met.price ? ray : met;
    }
    logger.info({ ray, met, choice }, 'Routing decision');
    return { dex: choice.dex, quote: choice };
  }

  async executeSwap(dex: DexName, order: Order, quote: DexQuote): Promise<ExecuteResult> {
    await randomDelay(2000, 3000);
    const executedPrice = randomVariance(quote.price, 1.5);
    const slippage = Math.abs((executedPrice - quote.price) / quote.price) * 10000;
    if (slippage > order.slippageBps) {
      throw new Error(`Slippage ${slippage.toFixed(2)}bps exceeds allowed ${order.slippageBps}bps`);
    }
    const txHash = randomUUID().replace(/-/g, '');
    return { txHash, executedPrice };
  }
}
