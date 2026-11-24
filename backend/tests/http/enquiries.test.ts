import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.ts';

const valid = { productId: 6, name: '  Ann Lee ', email: ' ann@example.test ', phone: '', message: ' Do you ship? ' };

let close: (() => Promise<void>) | undefined;
async function start(rateLimitMax = 100) {
  const built = buildTestApp({
    enquiries: { from: 'catalogue@example.test', salesInbox: 'sales@example.test', rateLimitMax },
  });
  await built.app.ready();
  close = () => built.app.close();
  return { server: built.app.server, emailSender: built.emailSender };
}
afterEach(async () => {
  await close?.();
});

describe('POST /api/enquiries', () => {
  it('sends the email and returns 201 { ok: true }, with trimmed input', async () => {
    const { server, emailSender } = await start();
    const response = await request(server).post('/api/enquiries').send(valid);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });
    expect(emailSender.sent[0]).toMatchObject({ replyTo: 'ann@example.test' });
    expect(emailSender.sent[0]?.text).toContain('Customer name: Ann Lee\n');
    expect(emailSender.sent[0]?.text).toContain('Customer phone: not given');
    expect(emailSender.sent[0]?.text).toMatch(/\nDo you ship\?$/);
  });

  it.each([
    ['name', { name: '' }],
    ['name', { name: 'x'.repeat(101) }],
    ['name', { name: 'Ann\r\nBcc: evil@example.test' }],
    ['email', { email: 'not-an-email' }],
    ['email', { email: 'ann@example.test\r\nBcc: evil@example.test' }],
    ['phone', { phone: 'call me' }],
    ['phone', { phone: '((((((' }],
    ['message', { message: 'x'.repeat(1001) }],
    ['productId', { productId: '6' }],
    ['productId', { productId: undefined }],
  ])('rejects an invalid %s with 400 and sends nothing', async (field, patch) => {
    const { server, emailSender } = await start();
    const response = await request(server).post('/api/enquiries').send({ ...valid, ...patch });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toContainEqual(expect.objectContaining({ path: field }));
    expect(JSON.stringify(response.body)).not.toContain('evil@example.test');
    expect(emailSender.sent).toEqual([]);
  });

  it.each([['blank', '   '], ['missing', undefined]])('accepts a %s message', async (_label, message) => {
    const { server, emailSender } = await start();
    const response = await request(server).post('/api/enquiries').send({ ...valid, message });

    expect(response.status).toBe(201);
    expect(emailSender.sent[0]?.text).toMatch(/\nMessage:\n\(no message\)$/);
  });

  it('accepts a valid phone number', async () => {
    const { server, emailSender } = await start();
    const response = await request(server).post('/api/enquiries').send({ ...valid, phone: '+61 (2) 9000-0000' });

    expect(response.status).toBe(201);
    expect(emailSender.sent[0]?.text).toContain('Customer phone: +61 (2) 9000-0000');
  });

  it('returns 404 for an unknown product', async () => {
    const { server } = await start();
    const response = await request(server).post('/api/enquiries').send({ ...valid, productId: 999 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 502 with a generic message when sending fails', async () => {
    const { server, emailSender } = await start();
    emailSender.failWith = new Error('connect ECONNREFUSED 10.0.0.5:25');
    const response = await request(server).post('/api/enquiries').send(valid);

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('EMAIL_FAILED');
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
  });

  it('rejects a non-object body with 400', async () => {
    const { server } = await start();
    const response = await request(server).post('/api/enquiries').set('content-type', 'text/plain').send('hi');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unsupported content type with 415 in the standard error shape', async () => {
    const { server } = await start();
    const response = await request(server).post('/api/enquiries').set('content-type', 'application/xml').send('<a/>');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects malformed JSON with 400 in the standard error shape', async () => {
    const { server } = await start();
    const response = await request(server).post('/api/enquiries').set('content-type', 'application/json').send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('rate-limits per client after RATE_LIMIT_MAX requests a minute', async () => {
    const { server } = await start(2);
    const post = () => request(server).post('/api/enquiries').send(valid);

    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);
    const limited = await post();
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } });
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('does not rate-limit other routes', async () => {
    const { server } = await start(1);
    for (let i = 0; i < 3; i += 1) {
      expect((await request(server).get('/api/categories')).status).toBe(200);
    }
  });
});
