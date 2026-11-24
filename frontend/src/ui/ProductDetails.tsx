import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { categoryPath } from '../paths.ts';
import type { Product } from '../types/index.ts';
import { formatCategory, formatPrice } from './format.ts';
import { Rating } from './Rating.tsx';
import styles from './ProductDetails.module.css';

interface ProductDetailsProps {
  readonly product: Product;
  /** Actions under the details, e.g. the Enquire button and the enquiry panel. */
  readonly children?: ReactNode;
}

/** Full product view: image beside title (the page's h1), category, price, rating, description. */
export function ProductDetails({ product, children }: ProductDetailsProps) {
  return (
    <article className={styles.product}>
      <div className={styles.imageFrame}>
        <img src={product.imageUrl} alt={product.title} className={styles.image} />
      </div>
      <div className={styles.details}>
        <p className={styles.category}>
          <Link to={categoryPath(product.category)}>{formatCategory(product.category)}</Link>
        </p>
        <h1 className={styles.title}>{product.title}</h1>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        <Rating rating={product.rating} />
        <p className={styles.description}>{product.description}</p>
        {children}
      </div>
    </article>
  );
}
