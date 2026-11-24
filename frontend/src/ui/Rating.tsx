import type { Rating as RatingData } from '../types/index.ts';
import { formatCount, formatRate } from './format.ts';
import styles from './Rating.module.css';

interface RatingProps {
  readonly rating: RatingData;
  /** Id of the screen-reader text, so a parent can use it in aria-labelledby. */
  readonly id?: string;
}

/** "★ 4.7 (300)" on screen; "Rated 4.7 out of 5 from 300 ratings" for screen readers. */
export function Rating({ rating: { rate, count }, id }: RatingProps) {
  const unrated = count === 0;
  return (
    <p className={styles.rating}>
      <span className="visually-hidden" id={id}>
        {unrated ? 'No ratings yet' : `Rated ${formatRate(rate)} out of 5 from ${formatCount(count)} ratings`}
      </span>
      <span aria-hidden="true">{unrated ? 'No ratings yet' : `★ ${formatRate(rate)} (${formatCount(count)})`}</span>
    </p>
  );
}
