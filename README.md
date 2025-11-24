# **Eterna Labs Backend — Order Execution Engine**

A high-performance backend for real-time order execution with WebSocket status streaming, DEX routing (Raydium/Meteora), slippage protection, queue-based processing, and PostgreSQL persistence.

This engine simulates a Solana execution workflow while remaining fully extensible for real on-chain execution.

---

# **📌 Overview**

This project implements a **mock Solana order execution engine** that:

* Accepts **market orders** via HTTP
* Streams **live status updates** over WebSocket
* Routes trades between **simulated Raydium and Meteora DEXs**
* Processes execution using **BullMQ & Redis**
* Persists all data & lifecycle events in **PostgreSQL**

It is part of the **Eterna Labs** architecture.

---

# **✨ Why Market Orders?**

Market orders execute immediately at the best available price, making them ideal for demonstrating:

* Routing
* Slippage protection
* Transaction lifecycle
* Real-time status streaming

Future extensions can include:

* **Limit orders** → trigger when price conditions met
* **Sniper orders** → triggered on liquidity/launch events

---

# **🧱 Architecture**

### **Core Components**

* **Fastify HTTP + WebSocket**
  Endpoint: `/api/orders/execute`
* **BullMQ Queue (`order-execution`)**
  Concurrency: 10 • Exponential backoff
* **Mock DEX Router**
  Simulates Raydium/Meteora quotes + txn latency
* **PostgreSQL**
  Stores orders + status events
  Migration file: `src/db/migrations/001_init.sql`
* **WebSocket Subscriptions**
  Real-time push updates
  In-memory + Redis snapshots

---
### **Flow Diagram**

# **1️⃣ High-Level Architecture Diagram**

```
                      ┌──────────────────────────┐
                      │        Client App         │
                      │  (Web / Mobile / Script)  │
                      └──────────────┬────────────┘
                                     │ HTTP / WS
                                     ▼
                     ┌─────────────────────────────────┐
                     │         Fastify Server          │
                     │  /api/orders/execute (HTTP+WS)  │
                     └───────┬───────────┬────────────┘
                             │           │
                             │           │ WebSocket Updates
                             │           ▼
                             │    ┌──────────────────────┐
                             │    │    WS Subscribers    │
                             │    └──────────────────────┘
                             │
                             │ enqueue order
                             ▼
               ┌──────────────────────────────────────┐
               │              BullMQ Queue             │
               │        (order-execution queue)        │
               └──────────────┬───────────────────────┘
                              │ Worker consumes jobs
                              ▼
                ┌─────────────────────────────────────┐
                │           Worker Process            │
                │  routing → building → execution     │
                │       retry/backoff logic           │
                └──────────────────┬──────────────────┘
                                   │
                         write events / read snapshots
                                   │
             ┌─────────────────────┴────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
 │   Mock DEX        │   │     Redis        │   │     PostgreSQL       │
 │ Raydium/Meteora   │   │ status snapshot  │   │ orders + events      │
 └──────────────────┘   └──────────────────┘   └──────────────────────┘
```


# **2️⃣ Order Lifecycle (Sequence Diagram)**

```
Client
  │
  │ POST /api/orders/execute
  ▼
Fastify Server
  │
  │ save order → DB (status: pending)
  │ enqueue job → BullMQ
  ▼
BullMQ Queue
  │
  │ Worker picks up job
  ▼
Worker
  │
  │ status: routing
  │ → Mock DEX Router (Raydium/Meteora)
  │
  │ status: building
  │ → Build simulated tx
  │
  │ status: submitted
  │ → Simulate chain submission
  │
  │ status: confirmed | failed
  ▼
PostgreSQL + Redis snapshot
  │
  │ emit over WebSocket
  ▼
Client receives live status stream
```


# **3️⃣ Queue Processing Pipeline**

```
                ┌────────────────────────┐
                │   order-execution      │
                │        Queue           │
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │        Worker          │
                └───────────┬────────────┘
                            ▼
                   Routing Step
                      │
                      ▼
                 Building Step
                      │
                      ▼
                 Submission Step
                      │
                      ▼
        ┌────── Confirmed ──────┐
        │                        │
        ▼                        ▼
     Write event           If failed →
     to DB + Redis          retry (max 3)
        │
        ▼
 Broadcast via WebSocket
```

# **4️⃣ WebSocket Subscription Flow**

```
Client WebSocket
    │
    │ Connect → ws://localhost:4000/api/orders/execute
    ▼
Fastify WebSocket Handler
    │
    │ Client sends:
    │ { "type": "subscribe", "orderId": "123" }
    ▼
WS Manager
    │
    │ Map socket → orderId
    ▼
EventEmitter
    │
    │ Worker publishes:
    │ { orderId, status, payload }
    ▼
Subscribed Clients
    │
    ▼
Receive live streamed updates
```


# **5️⃣ Database Schema Diagram**

```
┌─────────────────────────────┐
│           orders             │
├─────────────────────────────┤
│ id (UUID)                   │
│ side (buy/sell)             │
│ token_in                    │
│ token_out                   │
│ amount_in                   │
│ order_type (market)         │
│ status                      │
│ slippage_bps                │
│ selected_dex                │
│ executed_price              │
│ tx_hash                     │
│ created_at                  │
│ updated_at                  │
└───────────────┬─────────────┘
                │ 1-to-many
                ▼
┌─────────────────────────────┐
│        order_events          │
├─────────────────────────────┤
│ id (UUID)                   │
│ order_id (FK → orders)      │
│ status                      │
│ payload (JSONB)             │
│ created_at                  │
└─────────────────────────────┘
```


# **6️⃣ End-to-End System Diagram**

```
         ┌───────────────────────────────┐
         │           Client UI           │
         └───────┬───────────────────────┘
                 │ HTTP (POST)
                 ▼
         ┌───────────────────────────────┐
         │        Fastify API Server     │
         └───────┬───────────────┬──────┘
                 │               │ WS (push)
                 ▼               ▼
       ┌────────────────┐   ┌───────────────┐
       │     BullMQ     │   │  WS Manager   │
       └──────┬─────────┘   └──────┬────────┘
              │ Worker pulls        │ broadcasts
              ▼                     ▼
       ┌───────────────────────────────────────────┐
       │               Worker Logic                 │
       │ routing → building → submitting → result   │
       └───────────────────┬───────────────────────┘
                           │ writes
                           ▼
       ┌───────────────┬───────────────┬────────────┐
       │  PostgreSQL    │     Redis     │ Mock DEXes  │
       │ order records  │ snapshots     │ Raydium/etc │
       └───────────────┴───────────────┴────────────┘
```

---

# **🚀 Features**

* ✅ Order submission & queueing (BullMQ + Redis)
* ✅ Real-time DEX routing (Raydium/Meteora simulation)
* ✅ Slippage protection
* ✅ WebSocket live status updates
* ✅ Automatic retries (exponential backoff)
* ✅ PostgreSQL persistence
* ✅ Structured logging (Pino)

---

# **⚙️ Setup Instructions**

### **Prerequisites**

* Node.js **20+**
* Redis
* PostgreSQL

### **1. Install packages**

```bash
npm install
```

### **2. Setup environment**

```bash
cp .env.sample .env
```

### **3. Run database migrations**

```bash
npm run migrate
```

### **4. Start services**

* Redis → `redis-server`
* PostgreSQL → ensure running

### **5. Start backend**

```bash
npm run dev     # dev mode
npm run build && npm start  # production
```

### **6. Run tests**

```bash
npm test
```

---

# **🧪 API Endpoints**

---

## **1. Health Check**

**GET** `http://localhost:4000/api/health`

**Response**

```json
{ "status": "ok" }
```

---

## **2. Submit Order**

**POST** `/api/orders/execute`

### **Body**

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

### **Response**

```json
{ "orderId": "uuid-here" }
```

### **Field Reference**

| Field         | Type       | Required | Description                  |                 |
| ------------- | ---------- | -------- | ---------------------------- | --------------- |
| `side`        | `"buy"     | "sell"`  | ✅                            | Trade direction |
| `tokenIn`     | string     | ✅        | From-token                   |                 |
| `tokenOut`    | string     | ✅        | To-token                     |                 |
| `amountIn`    | number     | ✅        | Amount                       |                 |
| `orderType`   | `"market"` | ✅        | Only market orders supported |                 |
| `slippageBps` | number     | ❌        | Default: 50                  |                 |

---

## **3. Get Order by ID**

**GET** `/api/orders/:id`

Returns the **full order row**:

```json
{
  "id": "uuid",
  "side": "buy",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1,
  "orderType": "market",
  "status": "confirmed",
  "selectedDex": "METEORA",
  "executedPrice": 19.87,
  "txHash": "271f046773ce...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## **4. Get Order Status History**

**GET** `/api/orders/:id/events`

Returns ordered status events:

```json
{
  "orderId": "uuid",
  "events": [
    { "status": "pending" },
    { "status": "routing" },
    { "status": "building" },
    { "status": "submitted" },
    { "status": "confirmed" }
  ]
}
```

---

## **5. WebSocket Status Stream**

**URL:**
`ws://localhost:4000/api/orders/execute`

### **Subscribe**

```json
{ "type": "subscribe", "orderId": "uuid" }
```

### **Incoming Events**

```json
{
  "orderId": "uuid",
  "status": "routing",
  "payload": { "dex": "RAYDIUM", "price": 19.87 }
}
```

### **wscat example**

```bash
wscat -c ws://localhost:4000/api/orders/execute
{"type":"subscribe","orderId":"uuid"}
```

---

# **📡 Status Lifecycle**

```
pending → routing → building → submitted → confirmed
                               ↘
                                failed → retry → ...
```

---

# **🔧 Quick cURL Examples**

### Submit order:

```bash
curl -X POST http://localhost:4000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"side":"buy","tokenIn":"SOL","tokenOut":"USDC","amountIn":1,"orderType":"market"}'
```

### Get order:

```bash
curl http://localhost:4000/api/orders/<id>
```

### Get events:

```bash
curl http://localhost:4000/api/orders/<id>/events
```

---

# **🌐 Environment Variables**

```env
PORT=4000
REDIS_URL=redis://127.0.0.1:6379
DATABASE_URL=postgres://user:password@localhost:5432/eterna_labs
LOG_LEVEL=info
NODE_ENV=development
```

---

# **🐳 Deployment**

### **Docker**

```bash
docker build -t eterna-backend .
docker run -p 4000:4000 eterna-backend
```

### **PM2**

```bash
npm install -g pm2
pm2 start src/index.ts --name "eterna-backend"
```

---

# **❗ Common Issues**

### **WebSocket returns 404**

Use `ws://` not `http://`.

### **Slippage errors**

Increase `slippageBps` (try 100–200).

### **Redis errors**

Verify Redis is running:

```bash
redis-server
```

### **Database errors**

* Postgres must be running
* Migrations must be applied

---

# **📄 License**

MIT License

---
