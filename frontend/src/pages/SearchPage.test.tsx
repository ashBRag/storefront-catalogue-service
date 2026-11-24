import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchProducts } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { searchPath } from '../paths.ts';
import { mockApiDefaults } from '../test/mockApi.ts';
import { renderApp } from '../test/renderApp.tsx';
import type { Product } from '../types/index.ts';

vi.mock('../api/catalogue.ts');
const mockedSearch = vi.mocked(searchProducts);

function product(id: number, title = `Product ${id}`): Product {
  return {
    id,
    title,
    description: '',
    category: 'electronics',
    price: id,
    imageUrl: `https://images.example.test/${id}.png`,
    rating: { rate: 4, count: 10 },
  };
}

beforeEach(() => {
  mockApiDefaults();
});

const main = () => screen.getByRole('main');
const summary = () => within(main()).getAllByRole('status').at(-1)?.textContent;

describe('SearchPage', () => {
  it.each(['/search', '/search?q=', '/search?q=%20%20'])('%s prompts for a term and does not call the API', (url) => {
    renderApp(url);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Search');
    expect(within(main()).getByText('Enter a search term')).toBeTruthy();
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(document.title).toBe('Search | Product Catalogue');
  });

  it('searches for the trimmed query and shows the count and results in order', async () => {
    mockedSearch.mockResolvedValue([product(3), product(1)]);
    renderApp(searchPath('  bag '));

    expect(within(main()).getByText('Searching for “bag”…')).toBeTruthy();
    expect(await within(main()).findByText('2 results for “bag”')).toBeTruthy();
    expect(mockedSearch).toHaveBeenCalledWith('bag', expect.any(AbortSignal));

    const titles = within(main())
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(['Product 3', 'Product 1']);
    expect(document.title).toBe('Search: bag | Product Catalogue');
  });

  it('uses the singular for one result', async () => {
    mockedSearch.mockResolvedValue([product(1)]);
    renderApp(searchPath('lamp'));
    expect(await within(main()).findByText('1 result for “lamp”')).toBeTruthy();
  });

  it('shows an empty state, rendering the query as plain text', async () => {
    mockedSearch.mockResolvedValue([]);
    const query = '<img src=x onerror=alert(1)>';
    renderApp(searchPath(query));

    expect(await within(main()).findByText(`No products match “${query}”`)).toBeTruthy();
    expect(summary()).toBe(`0 results for “${query}”`);
    expect(main().querySelector('img')).toBeNull();
  });

  it('shows a friendly message for a 400, without retry', async () => {
    mockedSearch.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Request is invalid'));
    renderApp(searchPath('x'.repeat(150)));

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain("We can't search for that");
    expect(alert.textContent).toContain('between 1 and 100 characters');
    expect(alert.textContent).not.toContain('Request is invalid');
    expect(within(alert).queryByRole('button')).toBeNull();
  });

  it('shows other errors with a retry', async () => {
    mockedSearch.mockRejectedValueOnce(new ApiError(502, 'UPSTREAM_ERROR', 'The product service is unavailable. Please try again.'));
    mockedSearch.mockResolvedValueOnce([product(1)]);
    renderApp(searchPath('bag'));

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain('The product service is unavailable');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(main()).findByText('1 result for “bag”')).toBeTruthy();
  });

  it('cancels the in-flight search when q changes, and ignores its late response', async () => {
    let resolveFirst!: (products: Product[]) => void;
    const signals: AbortSignal[] = [];
    mockedSearch.mockImplementation((query, signal) => {
      if (signal !== undefined) signals.push(signal);
      return query === 'slow'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve([product(2, 'Fast result')]);
    });
    renderApp(searchPath('slow'));

    const box = screen.getByRole('searchbox', { name: 'Search products' });
    await userEvent.clear(box);
    await userEvent.type(box, 'fast{Enter}');

    expect(await within(main()).findByText('1 result for “fast”')).toBeTruthy();
    expect(signals[0]?.aborted).toBe(true);

    await act(async () => {
      resolveFirst([product(1, 'Stale result')]);
    });
    expect(within(main()).queryByText('Stale result')).toBeNull();
    expect(within(main()).getByText('Fast result')).toBeTruthy();
  });

  it('keeps the header search box in sync with the URL', async () => {
    mockedSearch.mockResolvedValue([]);
    renderApp(searchPath('backpack'));

    expect(screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search products' }).value).toBe('backpack');
  });
});
