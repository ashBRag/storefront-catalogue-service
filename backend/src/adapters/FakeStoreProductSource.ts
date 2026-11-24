import { z } from 'zod';
import { UpstreamError } from '../domain/errors.ts';
import type { Product } from '../domain/product.ts';
import type { ProductSource } from '../ports/ProductSource.ts';

// The Fake Store API's shapes stay in this file. Nothing outside it sees them.
const fakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string(),
  image: z.url(),
  rating: z.object({
    rate: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
});
type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

const fakeStoreProductListSchema = z.array(fakeStoreProductSchema);
const fakeStoreCategoryListSchema = z.array(z.string());

const DEFAULT_TIMEOUT_MS = 5_000;

export interface FakeStoreOptions {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  /** Injected in tests; defaults to the global fetch. */
  readonly fetchFn?: typeof fetch;
}

export class FakeStoreProductSource implements ProductSource {
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: FakeStoreOptions) {
    // Trailing slash so relative paths resolve under any base path.
    this.baseUrl = new URL(options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async listProducts(): Promise<readonly Product[]> {
    const body = await this.getJson('products');
    return parse(fakeStoreProductListSchema, body, 'products').map(toProduct);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const body = await this.getJson(`products/${id}`);
    // Fake Store answers an unknown id with 200 and an empty body (or null).
    if (body === undefined || body === null) {
      return undefined;
    }
    return toProduct(parse(fakeStoreProductSchema, body, `product ${id}`));
  }

  async listCategories(): Promise<readonly string[]> {
    const body = await this.getJson('products/categories');
    return parse(fakeStoreCategoryListSchema, body, 'categories');
  }

  /** GETs a path and returns the parsed JSON, or undefined for an empty body. */
  private async getJson(path: string): Promise<unknown> {
    const text = await this.getText(new URL(path, this.baseUrl));
    if (text.trim() === '') {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new UpstreamError('invalid-response', `Product API returned invalid JSON for ${path}`, {
        cause: error,
      });
    }
  }

  private async getText(url: URL): Promise<string> {
    let response: Response;
    let text: string;
    try {
      response = await this.fetchFn(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      text = await response.text();
    } catch (error) {
      throw toTransportError(error, url, this.timeoutMs);
    }
    if (!response.ok) {
      throw new UpstreamError('bad-status', `Product API responded ${response.status} for ${url.pathname}`);
    }
    return text;
  }
}

/** The one place the upstream shape is translated into ours. */
function toProduct(raw: FakeStoreProduct): Product {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    price: raw.price,
    imageUrl: raw.image,
    rating: { rate: raw.rating.rate, count: raw.rating.count },
  };
}

function parse<T>(schema: z.ZodType<T>, body: unknown, what: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new UpstreamError('invalid-response', `Product API returned unexpected data for ${what}`, {
      cause: result.error,
    });
  }
  return result.data;
}

function toTransportError(error: unknown, url: URL, timeoutMs: number): UpstreamError {
  const timedOut = error instanceof Error && error.name === 'TimeoutError';
  return timedOut
    ? new UpstreamError('timeout', `Product API timed out after ${timeoutMs}ms for ${url.pathname}`, { cause: error })
    : new UpstreamError('network', `Product API request failed for ${url.pathname}`, { cause: error });
}
