import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NETWORK_ERROR, UNEXPECTED_RESPONSE, request } from './client.ts';

function respond(status: number, body: unknown, contentType = 'application/json') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const fetchMock = vi.fn(async () => new Response(text, { status, headers: { 'content-type': contentType } }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => error,
  );
}

describe('request', () => {
  it('returns parsed JSON on 2xx', async () => {
    respond(200, [{ id: 1 }]);
    await expect(request('/api/products/featured')).resolves.toEqual([{ id: 1 }]);
  });

  it('sends a JSON body with POST', async () => {
    const fetchMock = respond(201, { ok: true });
    await request('/api/enquiries', { method: 'POST', body: { name: 'Ann' } });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/enquiries',
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"Ann"}',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
  });

  it('turns the backend error shape into an ApiError', async () => {
    respond(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request is invalid', details: [{ path: 'email', message: 'bad' }] },
    });
    const error = await caught(request('/api/enquiries'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Request is invalid' });
    expect((error as ApiError).fieldErrors).toEqual([{ path: 'email', message: 'bad' }]);
  });

  it('treats a non-2xx without the error shape (e.g. a proxy HTML page) as UNEXPECTED_RESPONSE', async () => {
    respond(502, '<html>Bad Gateway</html>', 'text/html');
    await expect(caught(request('/api/categories'))).resolves.toMatchObject({ status: 502, code: UNEXPECTED_RESPONSE });
  });

  it('turns a network failure into a NETWORK_ERROR ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(caught(request('/api/categories'))).resolves.toMatchObject({ status: 0, code: NETWORK_ERROR });
  });

  it('rethrows an abort unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('aborted', 'AbortError'))));
    const error = await caught(request('/api/categories', { signal: AbortSignal.abort() }));

    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});
