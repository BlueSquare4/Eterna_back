# Order Execution Engine (Mock)

## Project Overview
This project implements a mock Solana order execution engine that accepts market orders through a Fastify HTTP API and streams lifecycle updates over the same endpoint via WebSocket. Orders are routed between simulated Raydium and Meteora DEX venues, queued with BullMQ/Redis, and persisted to PostgreSQL with full status history.

## Why Market Orders
Market orders are the fastest way to demonstrate routing, execution, and status streaming because they execute immediately at the best available price without extra condition checks. The engine can be extended to support limit orders by watching price feeds and enqueuing execution when thresholds are met, and sniper orders by reacting to launch or liquidity events before routing and submitting swaps.

## Architecture
- **Fastify HTTP + WebSocket** on `/api/orders/execute` for submissions and streaming.
- **BullMQ + Redis** queue (`order-execution`) with concurrency 10 and exponential backoff.
- **MockDexRouter** simulates Raydium/Meteora quotes and swap execution with delays and variance.
- **PostgreSQL** stores orders and status events (see `src/db/migrations/001_init.sql`).
- **WebSocket subscriptions** managed in-memory mapping order IDs to client sets; snapshots are read from Redis when available.

Sequence overview:
```
Client POST /api/orders/execute -> order saved & enqueued -> worker processes (routing/building/submitted/confirmed|failed) -> status persisted -> status broadcast over WebSocket /api/orders/execute
```

## Setup Instructions
Prerequisites: Node.js 20+, PostgreSQL, Redis.

1. Install dependencies: `npm install`
2. Copy `.env.sample` to `.env` and adjust values.
3. Run migrations: `npm run migrate`
4. Start Redis, then run the server: `npm run dev` (development) or `npm run build && npm start` (production).
5. Run tests with `npm test`.

## How to Use
- **Submit order** (POST `/api/orders/execute`):
```json
{
  "side": "buy",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1,
  "orderType": "market",
  "slippageBps": 50
}
```
- **Subscribe for updates**: connect WebSocket to `/api/orders/execute`, then send `{ "type": "subscribe", "orderId": "<uuid>" }`. Incoming messages will include statuses `pending`, `routing`, `building`, `submitted`, `confirmed`, or `failed` with timestamps and payloads (e.g., chosen DEX, txHash, price).
- **Inspect order details**: `GET /api/orders/:id` returns the persisted order row (side, tokens, selected DEX, executed price, tx hash, etc.).
- **Inspect status history**: `GET /api/orders/:id/events` returns ordered status events so you can manually verify the lifecycle.
- Logs printed by the worker include routing decisions and errors.

### Quick cURL testing

```bash
# submit order
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"side":"buy","tokenIn":"SOL","tokenOut":"USDC","amountIn":1,"orderType":"market"}'

# fetch order row (replace <id>)
curl http://localhost:3000/api/orders/<id>

# fetch status history
curl http://localhost:3000/api/orders/<id>/events
```

## Notes
Blockchain interactions are fully mocked. To run on devnet, integrate Solana RPC and real Raydium/Meteora SDKs inside `MockDexRouter`, replace simulated swaps with actual transactions, and persist transaction signatures as `tx_hash`.
