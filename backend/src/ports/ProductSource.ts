import type { Product } from '../domain/product.ts';

/**
 * Where products come from. Swapping the data source means writing one new
 * implementation of this interface; nothing else changes.
 *
 * Implementations throw UpstreamError (src/domain/errors.ts) when the source
 * fails or returns invalid data.
 */
export interface ProductSource {
  listProducts(): Promise<readonly Product[]>;
  /** Resolves to undefined when no product has this id. */
  getProduct(id: number): Promise<Product | undefined>;
  listCategories(): Promise<readonly string[]>;
}
