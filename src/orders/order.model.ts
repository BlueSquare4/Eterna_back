export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market';
export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';
export type DexName = 'RAYDIUM' | 'METEORA';

export interface Order {
  id: string;
  side: OrderSide;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  orderType: OrderType;
  status: OrderStatus;
  selectedDex?: DexName;
  initialPrice?: number;
  executedPrice?: number;
  slippageBps: number;
  txHash?: string;
  errorReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderStatusEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  payload?: Record<string, unknown>;
  createdAt?: Date;
}

export interface DexQuote {
  dex: DexName;
  price: number;
  feeBps: number;
}

export interface RouteDecision {
  dex: DexName;
  quote: DexQuote;
}

export interface ExecuteResult {
  txHash: string;
  executedPrice: number;
}
