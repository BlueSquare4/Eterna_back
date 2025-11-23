import { FastifyInstance } from 'fastify';

async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({ status: 'ok' }));
}

export default healthRoute;
