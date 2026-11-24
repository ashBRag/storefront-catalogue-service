import { describe, expect, it, vi } from 'vitest';
import { InMemoryProductSource, productFixtures } from '../../src/adapters/InMemoryProductSource.ts';
import { NotFoundError, ValidationError } from '../../src/domain/errors.ts';
import type { Product } from '../../src/domain/product.ts';
import { CatalogueService, type CatalogueOptions } from '../../src/services/CatalogueService.ts';

// Fixture order by rating: 6, 2, 3, 1, 9, 5, 7, 4, 8, 10
const ids = (products: readonly Product[]) => products.map((product) => product.id);

function build(options: Partial<CatalogueOptions> = {}, products: readonly Product[] = productFixtures) {
  const logger = { warn: vi.fn() };
  const service = new CatalogueService(
    new InMemoryProductSource(products),
    { featuredProductIds: undefined, featuredCount: 5, ...options },
    logger,
  );
  return { service, logger };
}

describe('CatalogueService.getFeatured', () => {
  it('returns the top-rated products when no ids are configured', async () => {
    const { service } = build();
    expect(ids(await service.getFeatured())).toEqual([6, 2, 3, 1, 9]);
  });

  it('returns configured ids in the configured order', async () => {
    const { service, logger } = build({ featuredProductIds: [10, 4, 8, 7, 5] });
    expect(ids(await service.getFeatured())).toEqual([10, 4, 8, 7, 5]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('skips unknown ids with a warning and tops up by rating', async () => {
    const { service, logger } = build({ featuredProductIds: [10, 999, 6, 998] });
    expect(ids(await service.getFeatured())).toEqual([10, 6, 2, 3, 1]);
    expect(logger.warn).toHaveBeenCalledWith({ unknownIds: [999, 998] }, expect.any(String));
  });

  it('ignores duplicate configured ids', async () => {
    const { service } = build({ featuredProductIds: [4, 4, 4] });
    expect(ids(await service.getFeatured())).toEqual([4, 6, 2, 3, 1]);
  });

  it('truncates to the featured count when more ids are configured', async () => {
    const { service } = build({ featuredProductIds: [1, 2, 3, 4, 5, 6, 7] });
    expect(ids(await service.getFeatured())).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns fewer only when the catalogue is smaller than the count', async () => {
    const { service } = build({}, productFixtures.slice(0, 2));
    expect(ids(await service.getFeatured())).toEqual([2, 1]);
  });
});

describe('CatalogueService.listCategories', () => {
  it('passes through the source categories', async () => {
    const { service } = build();
    expect(await service.listCategories()).toEqual(['electronics', 'jewelery', "men's clothing"]);
  });
});

describe('CatalogueService.getCategoryProducts', () => {
  it('splits a category into the top 5 and the rest, both ranked', async () => {
    const extra = [1.0, 3.0, 4.5].map((rate, index) => ({
      ...productFixtures[0]!,
      id: 100 + index,
      rating: { rate, count: 1 },
    }));
    const { service } = build({}, [...productFixtures, ...extra]);

    const result = await service.getCategoryProducts('electronics');

    expect(ids(result.topRated)).toEqual([2, 3, 102, 1, 5]);
    expect(ids(result.others)).toEqual([101, 4, 100]);
  });

  it('returns an empty others list for a small category', async () => {
    const { service } = build();
    const result = await service.getCategoryProducts("men's clothing");
    expect(ids(result.topRated)).toEqual([9, 10]);
    expect(result.others).toEqual([]);
  });

  it('throws NotFoundError for an unknown category', async () => {
    const { service } = build();
    await expect(service.getCategoryProducts('Electronics')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CatalogueService.search', () => {
  it('matches title, description and category case-insensitively, ranked by rating', async () => {
    const { service } = build();
    expect(ids(await service.search('  JEWELERY '))).toEqual([6, 7, 8]);
    expect(ids(await service.search('test product 10'))).toEqual([10]);
  });

  it('treats regex characters literally', async () => {
    const { service } = build();
    expect(await service.search('.*')).toEqual([]);
    expect(ids(await service.search("men's"))).toEqual([9, 10]);
  });

  it('returns an empty list when nothing matches', async () => {
    const { service } = build();
    expect(await service.search('nothing like this')).toEqual([]);
  });

  it.each(['', '   ', 'x'.repeat(101)])('rejects an out-of-bounds query %#', async (query) => {
    const { service } = build();
    await expect(service.search(query)).rejects.toBeInstanceOf(ValidationError);
  });

  it('accepts a 100-character query', async () => {
    const { service } = build();
    await expect(service.search('x'.repeat(100))).resolves.toEqual([]);
  });
});

describe('CatalogueService.getProduct', () => {
  it('returns the product', async () => {
    const { service } = build();
    expect(await service.getProduct(6)).toMatchObject({ id: 6 });
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { service } = build();
    await expect(service.getProduct(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
