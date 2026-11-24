import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategoryProducts } from './api/catalogue.ts';
import { categoryPath } from './paths.ts';
import { mockApiDefaults } from './test/mockApi.ts';
import { renderApp } from './test/renderApp.tsx';

vi.mock('./api/catalogue.ts');

beforeEach(() => {
  mockApiDefaults();
});

const heading = () => screen.getByRole('heading', { level: 1 }).textContent;

describe('routes', () => {
  it.each([
    ['/', 'Top rated'],
    ['/search?q=lamp', 'Search results'],
    ['/products/7', 'Product 7'],
  ])('%s renders its page', (url, title) => {
    renderApp(url);
    expect(heading()).toBe(title);
  });

  it.each(['/nope', '/categories', '/products/1/extra'])('%s renders NotFound', (url) => {
    renderApp(url);
    expect(heading()).toBe('Page not found');
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toBeTruthy();
  });

  it.each(["men's clothing", 'women\'s "best"', '100% cotton', 'bags/backpacks', 'what? #1'])(
    'round-trips the category name %j through the URL',
    (category) => {
      renderApp(categoryPath(category));
      expect(getCategoryProducts).toHaveBeenCalledWith(category, expect.any(AbortSignal));
    },
  );
});
