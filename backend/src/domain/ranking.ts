import type { Product } from './product.ts';

/**
 * "Top rated" ordering: rating.rate descending, then rating.count descending
 * (more ratings = more trustworthy average), then id ascending so the order is
 * fully deterministic.
 */
export function compareByRating(a: Product, b: Product): number {
  return b.rating.rate - a.rating.rate || b.rating.count - a.rating.count || a.id - b.id;
}

/** Returns a new array sorted best-rated first. Does not mutate the input. */
export function rankByRating(products: readonly Product[]): Product[] {
  return [...products].sort(compareByRating);
}
