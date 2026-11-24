import { useId } from 'react';
import type { Product } from '../types/index.ts';
import { ProductGrid } from './ProductGrid.tsx';
import styles from './ProductSection.module.css';

interface ProductSectionProps {
  readonly title: string;
  readonly products: readonly Product[];
}

/** A titled group of products (an h2, with h3 tile titles under it). */
export function ProductSection({ title, products }: ProductSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <ProductGrid products={products} headingLevel={3} />
    </section>
  );
}
