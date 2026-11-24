import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EmailDeliveryError, NotFoundError, UpstreamError, ValidationError } from '../domain/errors.ts';
import type { ErrorResponse } from './schemas.ts';

interface Mapped {
  readonly status: number;
  readonly body: ErrorResponse;
}

/** One place that turns any thrown error into `{ error: { code, message, details? } }`. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const { status, body } = mapError(error);
    logError(request, status, error);
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`)),
  );
}

function mapError(error: unknown): Mapped {
  if (error instanceof ValidationError) {
    return { status: 400, body: errorBody('VALIDATION_ERROR', error.message, error.details) };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, body: errorBody('NOT_FOUND', error.message) };
  }
  if (error instanceof UpstreamError) {
    // Upstream messages can name URLs and internals: keep them in the log only.
    return { status: 502, body: errorBody('UPSTREAM_ERROR', 'The product service is unavailable. Please try again.') };
  }
  if (error instanceof EmailDeliveryError) {
    return { status: 502, body: errorBody('EMAIL_FAILED', "We couldn't send your enquiry. Please try again.") };
  }
  if (isFastifyClientError(error) && error.statusCode === 429) {
    return { status: 429, body: errorBody('RATE_LIMITED', 'Too many requests. Please try again later.') };
  }
  if (isFastifyClientError(error)) {
    // Fastify's own 4xx errors (e.g. malformed request) carry messages written for clients.
    return { status: error.statusCode, body: errorBody('BAD_REQUEST', error.message) };
  }
  // Anything else is a bug: never expose its message or stack, in any environment.
  return { status: 500, body: errorBody('INTERNAL_ERROR', 'Something went wrong.') };
}

function isFastifyClientError(error: unknown): error is FastifyError & { statusCode: number } {
  if (!(error instanceof Error) || !('statusCode' in error)) return false;
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
}

function logError(request: FastifyRequest, status: number, error: unknown): void {
  if (status >= 500) {
    request.log.error({ err: error, status }, 'request failed');
  } else {
    request.log.info({ status, code: error instanceof Error ? error.name : 'unknown' }, 'request rejected');
  }
}

function errorBody(code: string, message: string, details?: unknown): ErrorResponse {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
