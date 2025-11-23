import { env } from './config/env';
import { logger } from './config/logger';
import { buildServer } from './server/fastify';
import { registerWorker } from './queue/orderQueue';

const app = buildServer();
registerWorker();

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(() => logger.info(`Server listening on ${env.port}`))
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
