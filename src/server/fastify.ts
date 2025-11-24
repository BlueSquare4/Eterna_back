import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';

import { logger } from '../config/logger';
import healthRoute from './routes/health.route';
import ordersRoute from './routes/orders.route';

export function buildServer() {
  const app = Fastify({ logger });

  // MUST BE FIRST
  app.register(websocketPlugin);

  // Add prefix so it doesn't shadow other routes
  app.register(healthRoute, { prefix: '/api' });

  // Correct prefix for order-related routes
  app.register(ordersRoute, { prefix: '/api/orders' });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message
    });
  });

  return app;
}
