import { NotFoundError, ValidationError } from '../domain/errors.ts';
import type { Product } from '../domain/product.ts';
import { rankByRating } from '../domain/ranking.ts';
import type { Logger } from '../ports/Logger.ts';
import type { ProductSource } from '../ports/ProductSource.ts';

export const TOP_RATED_IN_CATEGORY = 5;
export const MAX_QUERY_LENGTH = 100;

export interface CatalogueOptions {
  /** Owner-picked featured ids, in display order. Undefined = pick by rating. */
  readonly featuredProductIds: readonly number[] | undefined;
  /** How many featured products to return (FEATURED_COUNT). */
  readonly featuredCount: number;
}

export interface CategoryProducts {
  readonly topRated: Product[];
  readonly others: Product[];
}

/** Catalogue use-cases. Depends only on the ProductSource port and the domain. */
export class CatalogueService {
  private readonly source: ProductSource;
  private readonly options: CatalogueOptions;
  private readonly logger: Logger;

  constructor(source: ProductSource, options: CatalogueOptions, logger: Logger) {
    this.source = source;
    this.options = options;
    this.logger = logger;
  }

  /**
   * FEATURED_COUNT products: the configured ids in order (unknown ids skipped
   * with a warning), topped up with the best-rated others if short.
   * Returns fewer only if the whole catalogue is smaller than the count.
   */
  async getFeatured(): Promise<Product[]> {
    const ranked = rankByRating(await this.source.listProducts());
    const picked = this.pickConfiguredFeatured(ranked);
    const pickedIds = new Set(picked.map((product) => product.id));
    const topUp = ranked.filter((product) => !pickedIds.has(product.id));
    return [...picked, ...topUp].slice(0, this.options.featuredCount);
  }

  async listCategories(): Promise<readonly string[]> {
    return this.source.listCategories();
  }

  /** Throws NotFoundError if the category does not exist (exact match). */
  async getCategoryProducts(category: string): Promise<CategoryProducts> {
    const [categories, products] = await Promise.all([
      this.source.listCategories(),
      this.source.listProducts(),
    ]);
    if (!categories.includes(category)) {
      throw new NotFoundError(`Category "${category}" not found`);
    }
    const ranked = rankByRating(products.filter((product) => product.category === category));
    return {
      topRated: ranked.slice(0, TOP_RATED_IN_CATEGORY),
      others: ranked.slice(TOP_RATED_IN_CATEGORY),
    };
  }

  /**
   * Case-insensitive substring match on title, description and category,
   * best-rated first. Throws ValidationError if the trimmed query is empty or
   * longer than MAX_QUERY_LENGTH.
   */
  async search(rawQuery: string): Promise<Product[]> {
    const query = normaliseQuery(rawQuery);
    const products = await this.source.listProducts();
    return rankByRating(products.filter((product) => matchesQuery(product, query)));
  }

  /** Throws NotFoundError if no product has this id. */
  async getProduct(id: number): Promise<Product> {
    const product = await this.source.getProduct(id);
    if (product === undefined) {
      throw new NotFoundError(`Product ${id} not found`);
    }
    return product;
  }

  private pickConfiguredFeatured(products: readonly Product[]): Product[] {
    const ids = [...new Set(this.options.featuredProductIds ?? [])];
    const byId = new Map(products.map((product) => [product.id, product]));
    const unknownIds = ids.filter((id) => !byId.has(id));
    if (unknownIds.length > 0) {
      this.logger.warn({ unknownIds }, 'FEATURED_PRODUCT_IDS contains unknown product ids; skipping them');
    }
    return ids.flatMap((id) => byId.get(id) ?? []);
  }
}

/** Trims and lower-cases the query; throws ValidationError if it is out of bounds. */
function normaliseQuery(rawQuery: string): string {
  const query = rawQuery.trim();
  if (query.length === 0 || query.length > MAX_QUERY_LENGTH) {
    throw new ValidationError(`Search query must be 1–${MAX_QUERY_LENGTH} characters after trimming`);
  }
  return query.toLowerCase();
}

/** Plain `includes`, never a RegExp, so user input can't inject patterns. */
function matchesQuery(product: Product, lowerCaseQuery: string): boolean {
  return [product.title, product.description, product.category].some((field) =>
    field.toLowerCase().includes(lowerCaseQuery),
  );
}
