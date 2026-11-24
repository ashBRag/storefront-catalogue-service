import type { Product } from '../types/index.ts';
import { ProductTile, type HeadingLevel } from './ProductTile.tsx';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  /** Rendered in the order given; the caller decides the order. */
  readonly products: readonly Product[];
  /** Heading level for each tile's title. */
  readonly headingLevel?: HeadingLevel;
}

/** Responsive list of product tiles. Empty states are the page's job. */
export function ProductGrid({ products, headingLevel }: ProductGridProps) {
  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
