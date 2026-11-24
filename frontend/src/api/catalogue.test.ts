import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategories, getCategoryProducts, getFeatured, getProduct, searchProducts, submitEnquiry } from './catalogue.ts';

function stubFetch() {
  const fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const calledUrl = (fetchMock: ReturnType<typeof stubFetch>) => fetchMock.mock.calls[0]?.at(0);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('catalogue API', () => {
  it.each([
    ['getFeatured', () => getFeatured(), '/api/products/featured'],
    ['getCategories', () => getCategories(), '/api/categories'],
  ])('%s calls %s', async (_name, call, url) => {
    const fetchMock = stubFetch();
    await call();
    expect(calledUrl(fetchMock)).toBe(url);
  });

  it('passes the AbortSignal through to fetch', async () => {
    const fetchMock = stubFetch();
    const controller = new AbortController();
    await getProduct(1, controller.signal);
    expect(fetchMock).toHaveBeenCalledWith('/api/products/1', expect.objectContaining({ signal: controller.signal }));
  });

  it('encodes category names', async () => {
    const fetchMock = stubFetch();
    await getCategoryProducts("men's clothing");
    expect(calledUrl(fetchMock)).toBe("/api/categories/men's%20clothing/products");
  });

  it('encodes the search query', async () => {
    const fetchMock = stubFetch();
    await searchProducts('a&b=c d');
    expect(calledUrl(fetchMock)).toBe('/api/products?q=a%26b%3Dc+d');
  });

  it('builds the product path from the id', async () => {
    const fetchMock = stubFetch();
    await getProduct(7);
    expect(calledUrl(fetchMock)).toBe('/api/products/7');
  });

  it('POSTs enquiries', async () => {
    const fetchMock = stubFetch();
    await submitEnquiry({ productId: 1, name: 'Ann', email: 'ann@example.test', message: 'Hi' });
    expect(fetchMock).toHaveBeenCalledWith('/api/enquiries', expect.objectContaining({ method: 'POST' }));
  });
});
