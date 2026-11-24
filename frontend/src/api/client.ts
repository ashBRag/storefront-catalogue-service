import type { ApiErrorBody, ApiErrorDetail } from '../types/index.ts';

/** Codes the client adds itself, for failures where the backend sent no error body. */
export const NETWORK_ERROR = 'NETWORK_ERROR';
export const UNEXPECTED_RESPONSE = 'UNEXPECTED_RESPONSE';

/** A failed API call. `status` is 0 when the request never got a response. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field errors from a 400 VALIDATION_ERROR, if the backend sent them. */
  get fieldErrors(): ApiErrorDetail[] {
    return Array.isArray(this.details) ? this.details.filter(isFieldError) : [];
  }
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST';
  /** Sent as JSON. */
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

/**
 * Calls our backend on the same origin and returns the parsed JSON.
 * Non-2xx and network failures throw ApiError. An abort rethrows the
 * AbortError unchanged, so callers can ignore it. Nothing is logged.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  const body = await readJson(response);
  if (!response.ok) {
    throw toApiError(response.status, body);
  }
  // The one trust boundary: our backend validates its own responses (see docs/PLAN.md).
  return body as T;
}

async function send(path: string, { method = 'GET', body, signal }: RequestOptions): Promise<Response> {
  try {
    return await fetch(path, {
      method,
      signal,
      headers: body === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, NETWORK_ERROR, 'Could not reach the server. Check your connection and try again.');
  }
}

/** Returns undefined for an empty or non-JSON body (e.g. an HTML error page from a proxy). */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  if (isApiErrorBody(body)) {
    return new ApiError(status, body.error.code, body.error.message, body.error.details);
  }
  return new ApiError(status, UNEXPECTED_RESPONSE, 'Something went wrong. Please try again.');
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

function isFieldError(value: unknown): value is ApiErrorDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
