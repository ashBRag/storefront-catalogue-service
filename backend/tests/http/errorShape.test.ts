import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { UpstreamError } from '../../src/domain/errors.ts';
import type { ProductSource } from '../../src/ports/ProductSource.ts';
import { buildTestApp } from '../helpers/testApp.ts';

// Every error, whatever produced it, must have exactly { error: { code, message, details? } }
// and must never leak a stack trace, file path or internal error text.

const failingSource = (error: Error): ProductSource => ({
  listProducts: () => Promise.reject(error),
  getProduct: () => Promise.reject(error),
  listCategories: () => Promise.reject(error),
});

const valid = { productId: 6, name: 'Ann', email: 'ann@example.test' };

interface Case {
  readonly name: string;
  readonly status: number;
  readonly code: string;
  readonly send: (agent: ReturnType<typeof request>) => request.Test;
  readonly setup?: Parameters<typeof buildTestApp>[0];
  readonly failEmail?: boolean;
}

const INTERNAL = 'secret internal detail at /srv/app/src/thing.ts:12';
const cases: Case[] = [
  { name: 'invalid search query', status: 400, code: 'VALIDATION_ERROR', send: (a) => a.get('/api/products?q=') },
  { name: 'invalid product id', status: 400, code: 'VALIDATION_ERROR', send: (a) => a.get('/api/products/abc') },
  { name: 'invalid enquiry', status: 400, code: 'VALIDATION_ERROR', send: (a) => a.post('/api/enquiries').send({ productId: 6 }) },
  { name: 'malformed JSON', status: 400, code: 'BAD_REQUEST', send: (a) => a.post('/api/enquiries').set('content-type', 'application/json').send('{"x":') },
  { name: 'unknown product', status: 404, code: 'NOT_FOUND', send: (a) => a.get('/api/products/999') },
  { name: 'unknown category', status: 404, code: 'NOT_FOUND', send: (a) => a.get('/api/categories/nope/products') },
  { name: 'unknown route', status: 404, code: 'NOT_FOUND', send: (a) => a.get('/api/nope') },
  { name: 'unsupported media type', status: 415, code: 'BAD_REQUEST', send: (a) => a.post('/api/enquiries').set('content-type', 'application/xml').send('<a/>') },
  {
    name: 'upstream failure',
    status: 502,
    code: 'UPSTREAM_ERROR',
    send: (a) => a.get('/api/products/featured'),
    setup: { productSource: failingSource(new UpstreamError('network', INTERNAL)) },
  },
  { name: 'email failure', status: 502, code: 'EMAIL_FAILED', send: (a) => a.post('/api/enquiries').send(valid), failEmail: true },
  {
    name: 'unexpected bug',
    status: 500,
    code: 'INTERNAL_ERROR',
    send: (a) => a.get('/api/categories'),
    setup: { productSource: failingSource(new TypeError(INTERNAL)) },
  },
];

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
});

describe('error responses', () => {
  it.each(cases.map((testCase) => [testCase.name, testCase] as const))(
    '%s: standard shape, right status and code, nothing internal leaked',
    async (_name, testCase) => {
      const { app, emailSender } = buildTestApp(testCase.setup);
      if (testCase.failEmail === true) emailSender.failWith = new Error(INTERNAL);
      await app.ready();
      close = () => app.close();

      const response = await testCase.send(request(app.server));
      const raw = JSON.stringify(response.body);

      expect(response.status).toBe(testCase.status);
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(Object.keys(response.body)).toEqual(['error']);
      expect(Object.keys(response.body.error).every((key) => ['code', 'message', 'details'].includes(key))).toBe(true);
      expect(response.body.error.code).toBe(testCase.code);
      expect(typeof response.body.error.message).toBe('string');
      expect(raw).not.toMatch(/stack|secret internal detail|\/srv\/|\.ts:\d|node_modules|\bat \w+ \(/);
    },
  );

  it('is rate limited (429) in the same shape', async () => {
    const { app } = buildTestApp({ enquiries: { from: 'a@example.test', salesInbox: 'b@example.test', rateLimitMax: 1 } });
    await app.ready();
    close = () => app.close();

    await request(app.server).post('/api/enquiries').send(valid);
    const response = await request(app.server).post('/api/enquiries').send(valid);

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } });
  });
});
