import { describe, expect, it } from 'vitest';
import { productFixtures } from '../../src/adapters/InMemoryProductSource.ts';
import type { Product } from '../../src/domain/product.ts';
import { rankByRating } from '../../src/domain/ranking.ts';

function rated(id: number, rate: number, count: number): Product {
  const base = productFixtures[0]!;
  return { ...base, id, rating: { rate, count } };
}

const ids = (products: readonly Product[]) => products.map((product) => product.id);

describe('rankByRating', () => {
  it('sorts by rate descending', () => {
    expect(ids(rankByRating([rated(1, 3, 10), rated(2, 5, 10), rated(3, 4, 10)]))).toEqual([2, 3, 1]);
  });

  it('breaks a rate tie by count descending', () => {
    expect(ids(rankByRating([rated(1, 4, 10), rated(2, 4, 90)]))).toEqual([2, 1]);
  });

  it('breaks a rate and count tie by id ascending', () => {
    expect(ids(rankByRating([rated(9, 4, 10), rated(3, 4, 10), rated(5, 4, 10)]))).toEqual([3, 5, 9]);
  });

  it('does not mutate its input', () => {
    const input = [rated(1, 1, 1), rated(2, 5, 1)];
    rankByRating(input);
    expect(ids(input)).toEqual([1, 2]);
  });
});
