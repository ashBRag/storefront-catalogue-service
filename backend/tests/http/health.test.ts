import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('GET /health', () => {
  const { app } = buildTestApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok', async () => {
    const response = await request(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('sets security headers', async () => {
    const response = await request(app.server).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('generates a request id when none is sent', async () => {
    const response = await request(app.server).get('/health');

    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('echoes a safe incoming request id', async () => {
    const response = await request(app.server).get('/health').set('x-request-id', 'abc-123');

    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('replaces an unsafe incoming request id', async () => {
    const response = await request(app.server).get('/health').set('x-request-id', 'bad id\twith spaces');

    expect(response.headers['x-request-id']).toMatch(UUID);
  });
});
