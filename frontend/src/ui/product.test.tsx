import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types/index.ts';
import { formatPrice } from './format.ts';
import { ProductGrid } from './ProductGrid.tsx';
import { ProductTile } from './ProductTile.tsx';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    title: 'Fjallraven Backpack',
    description: 'A backpack',
    category: "men's clothing",
    price: 1109.5,
    imageUrl: 'https://images.example.test/1.png',
    rating: { rate: 3.9, count: 1200 },
    ...overrides,
  };
}

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('formatPrice', () => {
  it('formats as USD', () => {
    expect(formatPrice(1109.5)).toBe('$1,109.50');
    expect(formatPrice(0.1)).toBe('$0.10');
  });
});

describe('ProductTile', () => {
  it('is one link to the product page, named by title, price and rating', () => {
    inRouter(<ProductTile product={product()} />);
    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/products/1');
    expect(screen.getByRole('link', { name: 'Fjallraven Backpack $1,109.50 Rated 3.9 out of 5 from 1,200 ratings' })).toBeTruthy();
  });

  it('shows the image with alt text, title, price and rating', () => {
    inRouter(<ProductTile product={product()} />);

    expect(screen.getByRole('img', { name: 'Fjallraven Backpack' }).getAttribute('src')).toBe('https://images.example.test/1.png');
    expect(screen.getByRole('heading', { level: 2, name: 'Fjallraven Backpack' })).toBeTruthy();
    expect(screen.getByText('$1,109.50')).toBeTruthy();
    expect(screen.getByText('★ 3.9 (1,200)')).toBeTruthy();
  });

  it('says when a product has no ratings', () => {
    inRouter(<ProductTile product={product({ rating: { rate: 0, count: 0 } })} />);
    expect(screen.getByRole('link', { name: /No ratings yet/ })).toBeTruthy();
  });

  it('uses the requested heading level', () => {
    inRouter(<ProductTile product={product()} headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
  });
});

describe('ProductGrid', () => {
  it('renders a list item per product, in the given order', () => {
    inRouter(<ProductGrid products={[product({ id: 2, title: 'B' }), product({ id: 1, title: 'A' })]} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');

    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['B', 'A']);
  });
});
