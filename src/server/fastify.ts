import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';

import { logger } from '../config/logger';
import healthRoute from './routes/health.route';
import ordersRoute from './routes/orders.route';

export function buildServer() {
  const app = Fastify({ logger });
  app.register(websocketPlugin);
  app.register(healthRoute);
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
