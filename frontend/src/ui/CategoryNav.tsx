import { NavLink } from 'react-router';
import { categoryPath } from '../paths.ts';
import styles from './CategoryNav.module.css';

interface CategoryNavProps {
  readonly status: 'loading' | 'error' | 'success';
  /** Shown when status is 'success'. */
  readonly categories: readonly string[];
  readonly onRetry: () => void;
}

/** Category links. On failure the rest of the page still works and the user can retry. */
export function CategoryNav({ status, categories, onRetry }: CategoryNavProps) {
  return (
    <nav aria-label="Categories" className={styles.nav}>
      {status === 'loading' && <p className={styles.note}>Loading categories…</p>}
      {status === 'error' && (
        <p className={styles.note}>
          Categories are unavailable right now.{' '}
          <button type="button" className={styles.retry} onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {status === 'success' && (
        <ul className={styles.list}>
          {categories.map((category) => (
            <li key={category}>
              <NavLink
                to={categoryPath(category)}
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
              >
                {category}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
