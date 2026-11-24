import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandling } from './http/errorHandler.ts';
import { catalogueRoutes } from './http/routes/catalogue.ts';
import { healthRoutes } from './http/routes/health.ts';
import type { ProductSource } from './ports/ProductSource.ts';
import { CatalogueService, type CatalogueOptions } from './services/CatalogueService.ts';

/**
 * Everything the app needs from outside. The HTTP layer only ever sees services
 * (built on ports), never concrete adapters.
 */
export interface AppDeps {
  /** pino options, or `false` to silence logging (tests). */
  readonly logger: FastifyServerOptions['logger'];
  readonly productSource: ProductSource;
  readonly catalogue: CatalogueOptions;
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

  registerErrorHandling(app);
  // Security headers. The API serves only JSON; nginx sets the headers for the HTML pages.
  app.register(helmet);
  app.register(healthRoutes);
  // Built here, not passed in, so the service logs through Fastify's logger.
  const catalogue = new CatalogueService(deps.productSource, deps.catalogue, app.log.child({ component: 'catalogue' }));
  app.register(catalogueRoutes, { catalogue });

  return app;
}

/** Reuses a caller's request id if it is safe to log, otherwise generates one. */
function requestIdFor(request: IncomingMessage): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
