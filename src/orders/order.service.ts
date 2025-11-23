import { v4 as uuid } from 'uuid';

import { db } from '../db/client';
import { DexName, Order, OrderStatus, OrderStatusEvent } from './order.model';

export const OrdersRepo = {
  async create(order: Omit<Order, 'status' | 'selectedDex' | 'txHash' | 'errorReason'>) {
    const id = order.id || uuid();
    const { side, tokenIn, tokenOut, amountIn, orderType, slippageBps } = order;
    const status: OrderStatus = 'pending';
    await db.query(
      `INSERT INTO orders (id, side, token_in, token_out, amount_in, order_type, status, slippage_bps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, side, tokenIn, tokenOut, amountIn, orderType, status, slippageBps]
    );
    return {
      id,
      side,
      tokenIn,
      tokenOut,
      amountIn,
      orderType,
      status,
      slippageBps
    } as Order;
  },
  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: {
      selectedDex?: DexName;
      executedPrice?: number;
      txHash?: string;
      errorReason?: string;
    }
  ) {
    const res = await db.query(
      `UPDATE orders SET status=$1, selected_dex=$2, executed_price=$3, tx_hash=$4, error_reason=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [status, options?.selectedDex, options?.executedPrice, options?.txHash, options?.errorReason, id]
    );
    return res.rows[0] as Order;
  },
  async addStatusEvent(event: OrderStatusEvent) {
    await db.query(
      `INSERT INTO order_status_events (id, order_id, status, payload) VALUES ($1,$2,$3,$4)`,
      [event.id, event.orderId, event.status, event.payload || {}]
    );
  },
  async getOrder(id: string) {
    const res = await db.query<Order>(`SELECT * FROM orders WHERE id=$1`, [id]);
    return res.rows[0];
  },
  async getStatusEvents(orderId: string) {
    const res = await db.query<OrderStatusEvent>(
      `SELECT * FROM order_status_events WHERE order_id=$1 ORDER BY created_at ASC`,
      [orderId]
    );
    return res.rows;
  }
};
