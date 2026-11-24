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

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;
const MIN_PHONE_DIGITS = 6;

/** A blank optional field (e.g. an empty form input) counts as not given. */
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const enquiryBody = z.object({
  productId: z.number().int().positive(),
  name: z.string().trim().min(1, 'is required').max(100).regex(/^[^\r\n]*$/, 'must be a single line'),
  email: z.string().trim().pipe(z.email('must be a valid email address').max(254)),
  phone: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(PHONE_PATTERN, 'must be 6–20 digits, spaces, +, -, or ()')
      .refine((phone) => phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS, 'must contain at least 6 digits')
      .optional(),
  ),
  message: z.string().trim().min(1, 'is required').max(1000),
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
export interface EnquiryResponse {
  readonly ok: true;
}

export interface ErrorResponse {
  readonly error: { readonly code: string; readonly message: string; readonly details?: unknown };
}
