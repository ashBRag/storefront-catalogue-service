import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategories, getCategoryProducts } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { categoryPath } from '../paths.ts';
import { mockApiDefaults } from '../test/mockApi.ts';
import { renderApp } from '../test/renderApp.tsx';
import type { Product } from '../types/index.ts';

vi.mock('../api/catalogue.ts');
const mockedGetCategoryProducts = vi.mocked(getCategoryProducts);

function product(id: number): Product {
  return {
    id,
    title: `Product ${id}`,
    description: '',
    category: "men's clothing",
    price: id,
    imageUrl: `https://images.example.test/${id}.png`,
    rating: { rate: 4, count: 10 },
  };
}

beforeEach(() => {
  mockApiDefaults();
  vi.mocked(getCategories).mockResolvedValue(['electronics', "men's clothing"]);
});

const main = () => screen.getByRole('main');
const sectionTitles = (section: HTMLElement) =>
  within(section)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);

describe('CategoryPage', () => {
  it('shows top rated, then more, each as a labelled section in backend order', async () => {
    mockedGetCategoryProducts.mockResolvedValue({ topRated: [4, 2, 9].map(product), others: [7, 1].map(product) });
    renderApp(categoryPath("men's clothing"));

    expect(within(main()).getByRole('status')).toBeTruthy();
    const top = await screen.findByRole('region', { name: "Top rated in men's clothing" });
    const more = screen.getByRole('region', { name: "More in men's clothing" });

    expect(sectionTitles(top)).toEqual(['Product 4', 'Product 2', 'Product 9']);
    expect(sectionTitles(more)).toEqual(['Product 7', 'Product 1']);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Men's clothing");
    expect(document.title).toBe("Men's clothing | Product Catalogue");
  });

  it('hides the "More in" section when others is empty', async () => {
    mockedGetCategoryProducts.mockResolvedValue({ topRated: [product(1)], others: [] });
    renderApp(categoryPath('electronics'));

    await screen.findByRole('region', { name: 'Top rated in electronics' });
    expect(screen.queryByRole('region', { name: /More in/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /More in/ })).toBeNull();
  });

  it('shows an empty state when the category has no products', async () => {
    mockedGetCategoryProducts.mockResolvedValue({ topRated: [], others: [] });
    renderApp(categoryPath('electronics'));

    expect(await within(main()).findByText('No products in this category yet')).toBeTruthy();
  });

  it('shows "Category not found" with a link home on a 404', async () => {
    mockedGetCategoryProducts.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Category "shoes" not found'));
    renderApp(categoryPath('shoes'));

    expect(await screen.findByRole('heading', { level: 1, name: 'Category not found' })).toBeTruthy();
    expect(within(main()).queryByRole('alert')).toBeNull();
    expect(document.title).toBe('Category not found | Product Catalogue');

    await userEvent.click(within(main()).getByRole('link', { name: 'Go to the home page' }));
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('shows other errors with a retry', async () => {
    mockedGetCategoryProducts.mockRejectedValueOnce(
      new ApiError(502, 'UPSTREAM_ERROR', 'The product service is unavailable. Please try again.'),
    );
    mockedGetCategoryProducts.mockResolvedValueOnce({ topRated: [product(1)], others: [] });
    renderApp(categoryPath('electronics'));

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain('The product service is unavailable');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Top rated in electronics' })).toBeTruthy();
  });

  it.each(["men's clothing", '100% cotton', 'bags/backpacks', 'what? #1'])(
    'passes the decoded name %j to the API exactly once-decoded',
    async (category) => {
      mockedGetCategoryProducts.mockResolvedValue({ topRated: [], others: [] });
      renderApp(categoryPath(category));

      await within(main()).findByText('No products in this category yet');
      expect(mockedGetCategoryProducts).toHaveBeenCalledWith(category, expect.any(AbortSignal));
    },
  );

  it('does not crash on a malformed escape in the URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedGetCategoryProducts.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'not found'));
    renderApp('/categories/100%');

    expect(await screen.findByRole('heading', { level: 1, name: 'Category not found' })).toBeTruthy();
    expect(mockedGetCategoryProducts).toHaveBeenCalledWith('100%', expect.any(AbortSignal));
    warn.mockRestore();
  });

  it('loads the new category when switching via the nav', async () => {
    mockedGetCategoryProducts.mockImplementation(async (category) => ({
      topRated: [{ ...product(category === 'electronics' ? 1 : 2), category }],
      others: [],
    }));
    renderApp(categoryPath("men's clothing"));
    await screen.findByRole('region', { name: "Top rated in men's clothing" });

    await userEvent.click(screen.getByRole('link', { name: 'electronics' }));

    const top = await screen.findByRole('region', { name: 'Top rated in electronics' });
    expect(sectionTitles(top)).toEqual(['Product 1']);
  });
});
