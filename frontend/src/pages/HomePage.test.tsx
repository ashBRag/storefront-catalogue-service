import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFeatured, getProduct } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { mockApiDefaults } from '../test/mockApi.ts';
import { renderApp } from '../test/renderApp.tsx';
import type { Product } from '../types/index.ts';

vi.mock('../api/catalogue.ts');
const mockedGetFeatured = vi.mocked(getFeatured);

function product(id: number): Product {
  return {
    id,
    title: `Product ${id}`,
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

describe('HomePage', () => {
  it('shows a loading state, then the featured products in the order given', async () => {
    mockedGetFeatured.mockResolvedValue([5, 3, 1, 4, 2].map(product));
    renderApp('/');

    expect(within(main()).getByRole('status').textContent).toContain('Loading top rated products');
    const items = await within(main()).findAllByRole('listitem');

    expect(items.map((item) => within(item).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Product 5',
      'Product 3',
      'Product 1',
      'Product 4',
      'Product 2',
    ]);
    expect(within(main()).queryByRole('status')).toBeNull();
  });

  it('has one "Top rated" h1 and sets the document title', async () => {
    mockedGetFeatured.mockResolvedValue([product(1)]);
    renderApp('/');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Top rated');
    await waitFor(() => expect(document).toHaveProperty('title', 'Top rated | Product Catalogue'));
    await within(main()).findByRole('list');
  });

  it('opens the product page with its details when a tile is clicked', async () => {
    const seven = { ...product(7), description: 'A sturdy seven.', price: 70.5 };
    mockedGetFeatured.mockResolvedValue([seven]);
    vi.mocked(getProduct).mockResolvedValue(seven);
    const { currentUrl } = renderApp('/');

    await userEvent.click(await within(main()).findByRole('link', { name: /Product 7/ }));

    expect(currentUrl()).toBe('/products/7');
    expect(await screen.findByRole('heading', { level: 1, name: 'Product 7' })).toBeInTheDocument();
    expect(within(main()).getByText('$70.50')).toBeInTheDocument();
    expect(within(main()).getByText('A sturdy seven.')).toBeInTheDocument();
    expect(within(main()).getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
    expect(getProduct).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  it('shows the backend message on error, and retries', async () => {
    mockedGetFeatured.mockRejectedValueOnce(
      new ApiError(502, 'UPSTREAM_ERROR', 'The product service is unavailable. Please try again.'),
    );
    mockedGetFeatured.mockResolvedValueOnce([product(1)]);
    renderApp('/');

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load top rated products");
    expect(alert.textContent).toContain('The product service is unavailable. Please try again.');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(main()).findByRole('link', { name: /Product 1/ })).toBeTruthy();
    expect(mockedGetFeatured).toHaveBeenCalledTimes(2);
  });

  it('shows a generic message for a non-API error', async () => {
    mockedGetFeatured.mockRejectedValue(new TypeError('x is undefined'));
    renderApp('/');

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain('Something went wrong. Please try again.');
    expect(alert.textContent).not.toContain('x is undefined');
  });

  it('shows an empty state when there are no products', async () => {
    mockedGetFeatured.mockResolvedValue([]);
    renderApp('/');

    expect(await within(main()).findByText('No products to show yet')).toBeTruthy();
    expect(within(main()).queryByRole('list')).toBeNull();
  });
});
