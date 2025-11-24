const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000/api/orders/execute');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  // Replace with your actual order ID
  ws.send(JSON.stringify({ type: 'subscribe', orderId: 'd015477c-fd36-4286-bea3-64b5b5d5d930' }));
});

ws.on('message', (data) => {
  console.log('📨 Received:', JSON.parse(data));
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
});