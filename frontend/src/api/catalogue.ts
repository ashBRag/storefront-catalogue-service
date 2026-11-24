import type { EnquiryAccepted, EnquiryInput, Product, ProductsByCategory } from '../types/index.ts';
import { request } from './client.ts';

// One function per endpoint in docs/PLAN.md. Every function accepts an optional AbortSignal.

export function getFeatured(signal?: AbortSignal): Promise<Product[]> {
  return request('/api/products/featured', { signal });
}

export function getCategories(signal?: AbortSignal): Promise<string[]> {
  return request('/api/categories', { signal });
}

export function getCategoryProducts(category: string, signal?: AbortSignal): Promise<ProductsByCategory> {
  return request(`/api/categories/${encodeURIComponent(category)}/products`, { signal });
}

export function searchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
  return request(`/api/products?${new URLSearchParams({ q: query }).toString()}`, { signal });
}

export function getProduct(id: number, signal?: AbortSignal): Promise<Product> {
  return request(`/api/products/${id}`, { signal });
}

export function submitEnquiry(enquiry: EnquiryInput, signal?: AbortSignal): Promise<EnquiryAccepted> {
  return request('/api/enquiries', { method: 'POST', body: enquiry, signal });
}
