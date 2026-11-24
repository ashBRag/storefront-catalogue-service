import type { Product } from '../domain/product.ts';
import type { ProductSource } from '../ports/ProductSource.ts';

/** A ProductSource backed by an array. Used in tests; defaults to `productFixtures`. */
export class InMemoryProductSource implements ProductSource {
  private readonly products: readonly Product[];

  constructor(products: readonly Product[] = productFixtures) {
    this.products = products;
  }

  async listProducts(): Promise<readonly Product[]> {
    return this.products;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.find((product) => product.id === id);
  }

  /** Unique categories in order of first appearance. */
  async listCategories(): Promise<readonly string[]> {
    return [...new Set(this.products.map((product) => product.category))];
  }
}

function fixture(id: number, category: string, rate: number, count: number): Product {
  return {
    id,
    title: `Test product ${id}`,
    description: `Description of test product ${id} in ${category}`,
    category,
    price: id * 10 + 0.99,
    imageUrl: `https://images.example.test/products/${id}.png`,
    rating: { rate, count },
  };
}

/**
 * Small, deliberate dataset: three categories of different sizes (5, 3, 2),
 * a tie on rate broken by count (ids 2 and 3), and an unrated product (id 10).
 */
export const productFixtures: readonly Product[] = [
  fixture(1, 'electronics', 4.1, 120),
  fixture(2, 'electronics', 4.7, 300),
  fixture(3, 'electronics', 4.7, 80),
  fixture(4, 'electronics', 2.9, 45),
  fixture(5, 'electronics', 3.6, 200),
  fixture(6, 'jewelery', 4.9, 70),
  fixture(7, 'jewelery', 3.3, 15),
  fixture(8, 'jewelery', 1.9, 400),
  fixture(9, "men's clothing", 4.0, 250),
  fixture(10, "men's clothing", 0, 0),
];
