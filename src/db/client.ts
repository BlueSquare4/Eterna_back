import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';

export type QueryResultRow = Record<string, unknown>;

class InMemoryDb {
  orders: any[] = [];
  events: any[] = [];
}

const useMemory = env.nodeEnv === 'test' || !env.databaseUrl;
const memoryDb = new InMemoryDb();

const pool = useMemory
  ? null
  : new Pool({
      connectionString: env.databaseUrl
    });

export const db = {
  async query<T extends QueryResultRow>(text: string, params: any[] = []): Promise<{
    rows: T[];
  }> {
    if (useMemory) {
      logger.debug({ text, params }, 'InMemory DB query executed');
      if (text.startsWith('INSERT INTO orders')) {
        const order = params.reduce((acc, val, idx) => {
          const columns = [
            'id',
            'side',
            'token_in',
            'token_out',
            'amount_in',
            'order_type',
            'status',
            'selected_dex',
            'initial_price',
            'executed_price',
            'slippage_bps',
            'tx_hash',
            'error_reason'
          ];
          acc[columns[idx]] = val;
          return acc;
        }, {} as Record<string, any>);
        memoryDb.orders.push({ ...order, created_at: new Date(), updated_at: new Date() });
        return { rows: [order as T] };
      }
      if (text.startsWith('INSERT INTO order_status_events')) {
        const event = {
          id: params[0],
          order_id: params[1],
          status: params[2],
          payload: params[3],
          created_at: new Date()
        };
        memoryDb.events.push(event);
        return { rows: [event as T] };
      }
      if (text.startsWith('UPDATE orders')) {
        const [status, selectedDex, executedPrice, txHash, errorReason, id] = params;
        const order = memoryDb.orders.find((o) => o.id === id);
        if (order) {
          if (status !== undefined) order.status = status;
          order.selected_dex = selectedDex;
          order.executed_price = executedPrice;
          order.tx_hash = txHash;
          order.error_reason = errorReason;
          order.updated_at = new Date();
        }
        return { rows: order ? [order as T] : [] };
      }
      if (text.startsWith('SELECT')) {
        if (text.includes('FROM orders')) {
          return { rows: memoryDb.orders as T[] };
        }
        if (text.includes('FROM order_status_events')) {
          return { rows: memoryDb.events as T[] };
        }
      }
      return { rows: [] };
    }
    const res = await pool!.query<T>(text, params);
    return res;
  },
  async end() {
    if (pool) await pool.end();
  }
};
