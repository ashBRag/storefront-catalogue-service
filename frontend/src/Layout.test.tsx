import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategories, searchProducts } from './api/catalogue.ts';
import { ApiError } from './api/client.ts';
import { mockApiDefaults } from './test/mockApi.ts';
import { renderApp } from './test/renderApp.tsx';

vi.mock('./api/catalogue.ts');
const mockedGetCategories = vi.mocked(getCategories);

beforeEach(() => {
  mockApiDefaults();
  mockedGetCategories.mockResolvedValue(['electronics', "men's clothing"]);
});

describe('Layout header', () => {
  it('links the site name home', async () => {
    const { currentUrl } = renderApp('/search?q=x');
    await userEvent.click(screen.getByRole('link', { name: 'Product Catalogue' }));
    expect(currentUrl()).toBe('/');
  });

  it('lists categories as links with encoded URLs', async () => {
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'Categories' });
    const link = await within(nav).findByRole('link', { name: "men's clothing" });

    expect(link.getAttribute('href')).toBe("/categories/men's%20clothing");
  });

  it('decodes the category back on the category page', async () => {
    const { currentUrl } = renderApp();
    await userEvent.click(await screen.findByRole('link', { name: "men's clothing" }));

    expect(currentUrl()).toBe("/categories/men's%20clothing");
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Men's clothing");
  });

  it('shows a fallback with retry when categories fail, and the page still renders', async () => {
    mockedGetCategories.mockRejectedValueOnce(new ApiError(502, 'UPSTREAM_ERROR', 'down'));
    renderApp();

    expect(await screen.findByText(/categories are unavailable/i)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Top rated' })).toBeTruthy();
    expect(screen.getByRole('search')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'electronics' })).toBeTruthy();
  });
});

describe('search bar', () => {
  it('is a labelled search form', () => {
    renderApp();
    const form = screen.getByRole('search');
    expect(within(form).getByRole('searchbox', { name: 'Search products' })).toBeTruthy();
    expect(within(form).getByRole('button', { name: 'Search' })).toBeTruthy();
  });

  it('navigates to /search with the trimmed, encoded query', async () => {
    const { currentUrl } = renderApp();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), "  men's & co  ");
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(currentUrl()).toBe('/search?q=men%27s+%26+co');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Search results');
    expect(searchProducts).toHaveBeenCalledWith("men's & co", expect.any(AbortSignal));
  });

  it('submits on Enter', async () => {
    const { currentUrl } = renderApp();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'bag{Enter}');
    expect(currentUrl()).toBe('/search?q=bag');
  });

  it('does nothing for a blank query', async () => {
    const { currentUrl } = renderApp('/categories/electronics');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(currentUrl()).toBe('/categories/electronics');
  });

  it('shows the current query on the search page', () => {
    renderApp('/search?q=backpack');
    expect(screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search products' }).value).toBe('backpack');
  });
});
