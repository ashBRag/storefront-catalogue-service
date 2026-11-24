import { useId } from 'react';
import { Link } from 'react-router';
import { productPath } from '../paths.ts';
import type { Product } from '../types/index.ts';
import { formatCount, formatPrice, formatRate } from './format.ts';
import styles from './ProductTile.module.css';

export type HeadingLevel = 2 | 3;

interface ProductTileProps {
  readonly product: Product;
  /** Heading level for the title, to keep the page's heading order (h1 → h2 → h3). */
  readonly headingLevel?: HeadingLevel;
}

/**
 * One product as a single link to its page: the whole tile is clickable.
 * The link is named by the title, price and rating (not the image), so screen
 * readers hear each piece once.
 */
export function ProductTile({ product, headingLevel = 2 }: ProductTileProps) {
  const id = useId();
  const Title = headingLevel === 2 ? 'h2' : 'h3';
  const { rate, count } = product.rating;

  return (
    <Link to={productPath(product.id)} className={styles.tile} aria-labelledby={`${id}-title ${id}-price ${id}-rating`}>
      <div className={styles.imageFrame}>
        <img
          src={product.imageUrl}
          alt={product.title}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
      </div>
      <Title id={`${id}-title`} className={styles.title}>
        {product.title}
      </Title>
      <p id={`${id}-price`} className={styles.price}>
        {formatPrice(product.price)}
      </p>
      <p className={styles.rating}>
        <span className="visually-hidden" id={`${id}-rating`}>
          {count === 0 ? 'No ratings yet' : `Rated ${formatRate(rate)} out of 5 from ${formatCount(count)} ratings`}
        </span>
        <span aria-hidden="true">{count === 0 ? 'No ratings yet' : `★ ${formatRate(rate)} (${formatCount(count)})`}</span>
      </p>
    </Link>
  );
}
