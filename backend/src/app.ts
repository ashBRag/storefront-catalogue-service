import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { healthRoutes } from './http/routes/health.ts';

/**
 * Everything the app needs from outside. Services (built on ports) are added here
 * in later steps; the HTTP layer only ever sees these, never concrete adapters.
 */
export interface AppDeps {
  /** pino options, or `false` to silence logging (tests). */
  readonly logger: FastifyServerOptions['logger'];
}

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: deps.logger,
    requestIdHeader: false,
    genReqId: requestIdFor,
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });

  app.register(healthRoutes);

  return app;
}

/** Reuses a caller's request id if it is safe to log, otherwise generates one. */
function requestIdFor(request: IncomingMessage): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
