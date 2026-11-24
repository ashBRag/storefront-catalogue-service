export type UpstreamFailure = 'timeout' | 'network' | 'bad-status' | 'invalid-response';

/**
 * A product source (or other upstream) failed or returned data we can't trust.
 * Lives in the domain so services and the HTTP layer can handle it (→ 502)
 * without knowing which adapter threw it.
 */
export class UpstreamError extends Error {
  override readonly name = 'UpstreamError';
  readonly reason: UpstreamFailure;

  constructor(reason: UpstreamFailure, message: string, options?: ErrorOptions) {
    super(message, options);
    this.reason = reason;
  }
}

/** A requested resource (product, category) does not exist. The HTTP layer maps it to 404. */
export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
}

/** Caller input broke a business rule. The HTTP layer maps it to 400. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
  /** Safe to show the caller: which fields failed and why (never the submitted values). */
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

/** The email provider failed to accept a message. The HTTP layer maps it to 502. */
export class EmailDeliveryError extends Error {
  override readonly name = 'EmailDeliveryError';
}
