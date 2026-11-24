import { describe, expect, it } from 'vitest';
import { InMemoryProductSource, productFixtures } from '../../src/adapters/InMemoryProductSource.ts';

describe('InMemoryProductSource', () => {
  const source = new InMemoryProductSource();

  it('lists the fixture products by default', async () => {
    await expect(source.listProducts()).resolves.toEqual(productFixtures);
  });

  it('finds a product by id', async () => {
    await expect(source.getProduct(6)).resolves.toMatchObject({ id: 6, category: 'jewelery' });
  });

  it('returns undefined for an unknown id', async () => {
    await expect(source.getProduct(999)).resolves.toBeUndefined();
  });

  it('lists unique categories in order of first appearance', async () => {
    await expect(source.listCategories()).resolves.toEqual(['electronics', 'jewelery', "men's clothing"]);
  });

  it('can be seeded with other products', async () => {
    const seeded = new InMemoryProductSource([]);

    await expect(seeded.listProducts()).resolves.toEqual([]);
    await expect(seeded.listCategories()).resolves.toEqual([]);
  });
});
