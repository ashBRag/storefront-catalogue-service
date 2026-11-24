import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryProductSource } from '../../src/adapters/InMemoryProductSource.ts';
import { buildApp } from '../../src/app.ts';
import { UpstreamError } from '../../src/domain/errors.ts';
import type { ProductSource } from '../../src/ports/ProductSource.ts';

function appWith(productSource: ProductSource) {
  return buildApp({
    logger: false,
    productSource,
    catalogue: { featuredProductIds: undefined, featuredCount: 5 },
  });
}

const ids = (body: unknown) => (body as { id: number }[]).map((product) => product.id);

describe('catalogue routes', () => {
  const app = appWith(new InMemoryProductSource());

  beforeAll(async () => {
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /api/products/featured returns 5 top-rated products', async () => {
    const response = await request(app.server).get('/api/products/featured');
    expect(response.status).toBe(200);
    expect(ids(response.body)).toEqual([6, 2, 3, 1, 9]);
  });

  it('GET /api/categories lists categories', async () => {
    const response = await request(app.server).get('/api/categories');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(['electronics', 'jewelery', "men's clothing"]);
  });

  it('GET /api/categories/:category/products decodes the category', async () => {
    const response = await request(app.server).get(`/api/categories/${encodeURIComponent("men's clothing")}/products`);
    expect(response.status).toBe(200);
    expect(ids(response.body.topRated)).toEqual([9, 10]);
    expect(response.body.others).toEqual([]);
  });

  it('GET /api/categories/:category/products 404s for an unknown category', async () => {
    const response = await request(app.server).get('/api/categories/nope/products');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });

  it('GET /api/products?q= searches', async () => {
    const response = await request(app.server).get('/api/products').query({ q: 'jewelery' });
    expect(response.status).toBe(200);
    expect(ids(response.body)).toEqual([6, 7, 8]);
  });

  it.each([
    ['missing', ''],
    ['blank', '?q=%20%20'],
    ['too long', `?q=${'x'.repeat(101)}`],
    ['repeated', '?q=a&q=b'],
  ])('GET /api/products 400s when q is %s', async (_label, queryString) => {
    const response = await request(app.server).get(`/api/products${queryString}`);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: [expect.objectContaining({ path: 'q' })] });
  });

  it('GET /api/products/:id returns the product', async () => {
    const response = await request(app.server).get('/api/products/6');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 6, category: 'jewelery' });
  });

  it.each(['0', 'abc', '1.5', '-1', '9999999999'])('GET /api/products/%s is a 400', async (id) => {
    const response = await request(app.server).get(`/api/products/${id}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/products/:id 404s for an unknown id', async () => {
    const response = await request(app.server).get('/api/products/999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('unknown routes use the same error shape', async () => {
    const response = await request(app.server).get('/api/nope');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('error mapping for failing sources', () => {
  const failingWith = (error: Error): ProductSource => ({
    listProducts: () => Promise.reject(error),
    getProduct: () => Promise.reject(error),
    listCategories: () => Promise.reject(error),
  });

  it('maps UpstreamError to 502 without leaking its message', async () => {
    const app = appWith(failingWith(new UpstreamError('timeout', 'GET https://internal.example/products timed out')));
    await app.ready();
    const response = await request(app.server).get('/api/products/featured');
    await app.close();

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('internal.example');
  });

  it('maps an unexpected error to a generic 500', async () => {
    const app = appWith(failingWith(new TypeError('secret internal detail')));
    await app.ready();
    const response = await request(app.server).get('/api/categories');
    await app.close();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
  });
});
