import { z } from 'zod';
import type { Product } from '../domain/product.ts';
import { ValidationError } from '../domain/errors.ts';
import type { CategoryProducts } from '../services/CatalogueService.ts';

export const productIdParams = z.object({
  id: z.string().regex(/^[1-9]\d{0,8}$/, 'must be a positive integer').transform(Number),
});

/** Fastify has already URL-decoded the param (e.g. "men's clothing"). */
export const categoryParams = z.object({
  category: z.string().min(1).max(100),
});

export const searchQuery = z.object({
  q: z.string().trim().min(1, 'must not be empty').max(100, 'must be at most 100 characters'),
});

/** Parses request input or throws ValidationError (→ 400) listing each failing field. */
export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    throw new ValidationError('Request is invalid', details);
  }
  return result.data;
}

// Response bodies, one per route. Kept here so the HTTP contract (docs/PLAN.md) is in one place.
export type FeaturedResponse = Product[];
export type CategoriesResponse = readonly string[];
export type CategoryProductsResponse = CategoryProducts;
export type SearchResponse = Product[];
export type ProductResponse = Product;

export interface ErrorResponse {
  readonly error: { readonly code: string; readonly message: string; readonly details?: unknown };
}
