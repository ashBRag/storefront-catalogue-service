// Builds in-app URLs. The only place route params are encoded; React Router decodes
// them again in useParams, e.g. "men's clothing" ⇄ /categories/men's%20clothing.

export const homePath = (): string => '/';

export const categoryPath = (category: string): string => `/categories/${encodeURIComponent(category)}`;

export const searchPath = (query: string): string => `/search?${new URLSearchParams({ q: query }).toString()}`;

export const productPath = (id: number): string => `/products/${id}`;
