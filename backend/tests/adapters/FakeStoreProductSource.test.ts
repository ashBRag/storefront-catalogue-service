import { describe, expect, it, vi } from 'vitest';
import { FakeStoreProductSource } from '../../src/adapters/FakeStoreProductSource.ts';
import { UpstreamError, type UpstreamFailure } from '../../src/domain/errors.ts';

const BASE_URL = 'https://store.example.test';

const rawProduct = {
  id: 1,
  title: 'Backpack',
  price: 109.95,
  description: 'Fits 15" laptops',
  category: "men's clothing",
  image: 'https://store.example.test/img/1.png',
  rating: { rate: 3.9, count: 120 },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function sourceReturning(response: Response | Error): {
  source: FakeStoreProductSource;
  fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;
} {
  const fetchFn = vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { source: new FakeStoreProductSource({ baseUrl: BASE_URL, fetchFn }), fetchFn };
}

function requestedUrl(fetchFn: ReturnType<typeof vi.fn<typeof fetch>>): string {
  return String(fetchFn.mock.calls[0]?.[0]);
}

async function expectUpstreamError(promise: Promise<unknown>, reason: UpstreamFailure): Promise<void> {
  const error: unknown = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(UpstreamError);
  expect((error as UpstreamError).reason).toBe(reason);
}

describe('FakeStoreProductSource', () => {
  describe('mapping', () => {
    it('maps the upstream shape to our Product', async () => {
      const { source, fetchFn } = sourceReturning(json([rawProduct]));

      const products = await source.listProducts();

      expect(requestedUrl(fetchFn)).toBe(`${BASE_URL}/products`);
      expect(products).toEqual([
        {
          id: 1,
          title: 'Backpack',
          description: 'Fits 15" laptops',
          category: "men's clothing",
          price: 109.95,
          imageUrl: 'https://store.example.test/img/1.png',
          rating: { rate: 3.9, count: 120 },
        },
      ]);
    });

    it('drops upstream fields we do not model', async () => {
      const { source } = sourceReturning(json({ ...rawProduct, internalSku: 'X-1' }));

      const product = await source.getProduct(1);

      expect(product).not.toHaveProperty('internalSku');
      expect(product).not.toHaveProperty('image');
    });

    it('lists categories', async () => {
      const { source, fetchFn } = sourceReturning(json(['electronics', 'jewelery']));

      await expect(source.listCategories()).resolves.toEqual(['electronics', 'jewelery']);
      expect(requestedUrl(fetchFn)).toBe(`${BASE_URL}/products/categories`);
    });

    it('resolves paths under a base URL that has a path', async () => {
      const fetchFn = vi.fn<typeof fetch>(async () => json(rawProduct));
      const source = new FakeStoreProductSource({ baseUrl: `${BASE_URL}/api/v1`, fetchFn });

      await source.getProduct(1);

      expect(requestedUrl(fetchFn)).toBe(`${BASE_URL}/api/v1/products/1`);
    });
  });

  describe('getProduct', () => {
    it('returns the product for a known id', async () => {
      const { source, fetchFn } = sourceReturning(json(rawProduct));

      await expect(source.getProduct(1)).resolves.toMatchObject({ id: 1, title: 'Backpack' });
      expect(requestedUrl(fetchFn)).toBe(`${BASE_URL}/products/1`);
    });

    it('returns undefined for the empty 200 Fake Store sends for an unknown id', async () => {
      const { source } = sourceReturning(new Response('', { status: 200 }));

      await expect(source.getProduct(999)).resolves.toBeUndefined();
    });

    it('returns undefined for a null body', async () => {
      const { source } = sourceReturning(json(null));

      await expect(source.getProduct(999)).resolves.toBeUndefined();
    });
  });

  describe('failures', () => {
    it('rejects a non-2xx response', async () => {
      const { source } = sourceReturning(json({ message: 'boom' }, 503));

      await expectUpstreamError(source.listProducts(), 'bad-status');
    });

    it('rejects a network failure', async () => {
      const { source } = sourceReturning(new TypeError('fetch failed'));

      await expectUpstreamError(source.listProducts(), 'network');
    });

    it('rejects when the request times out', async () => {
      const fetchFn = vi.fn<typeof fetch>(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      );
      const source = new FakeStoreProductSource({ baseUrl: BASE_URL, timeoutMs: 10, fetchFn });

      await expectUpstreamError(source.listProducts(), 'timeout');
    });

    it('rejects a body that is not JSON', async () => {
      const { source } = sourceReturning(new Response('<html>oops</html>', { status: 200 }));

      await expectUpstreamError(source.listProducts(), 'invalid-response');
    });

    it('rejects an empty body where a list is expected', async () => {
      const { source } = sourceReturning(new Response('', { status: 200 }));

      await expectUpstreamError(source.listProducts(), 'invalid-response');
    });

    it.each([
      ['a missing field', { ...rawProduct, title: undefined }],
      ['a wrong type', { ...rawProduct, price: '109.95' }],
      ['an out-of-range rating', { ...rawProduct, rating: { rate: 7, count: 1 } }],
      ['an invalid image URL', { ...rawProduct, image: 'not a url' }],
    ])('rejects a product with %s', async (_label, product) => {
      const { source } = sourceReturning(json([rawProduct, product]));

      await expectUpstreamError(source.listProducts(), 'invalid-response');
    });

    it('rejects categories that are not a string list', async () => {
      const { source } = sourceReturning(json({ categories: ['electronics'] }));

      await expectUpstreamError(source.listCategories(), 'invalid-response');
    });
  });
});
