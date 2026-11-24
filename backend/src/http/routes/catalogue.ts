import type { FastifyPluginAsync } from 'fastify';
import type { CatalogueService } from '../../services/CatalogueService.ts';
import {
  categoryParams,
  parseInput,
  productIdParams,
  searchQuery,
  type CategoriesResponse,
  type CategoryProductsResponse,
  type FeaturedResponse,
  type ProductResponse,
  type SearchResponse,
} from '../schemas.ts';

export interface CatalogueRoutesOptions {
  readonly catalogue: CatalogueService;
}

/** Thin handlers: validate input with zod, call CatalogueService, return its result. */
export const catalogueRoutes: FastifyPluginAsync<CatalogueRoutesOptions> = async (app, { catalogue }) => {
  // Static path: Fastify matches it before /api/products/:id.
  app.get<{ Reply: FeaturedResponse }>('/api/products/featured', async () => catalogue.getFeatured());

  app.get<{ Reply: CategoriesResponse }>('/api/categories', async () => catalogue.listCategories());

  app.get<{ Reply: CategoryProductsResponse }>('/api/categories/:category/products', async (request) => {
    const { category } = parseInput(categoryParams, request.params);
    return catalogue.getCategoryProducts(category);
  });

  app.get<{ Reply: SearchResponse }>('/api/products', async (request) => {
    const { q } = parseInput(searchQuery, request.query);
    return catalogue.search(q);
  });

  app.get<{ Reply: ProductResponse }>('/api/products/:id', async (request) => {
    const { id } = parseInput(productIdParams, request.params);
    return catalogue.getProduct(id);
  });
};
