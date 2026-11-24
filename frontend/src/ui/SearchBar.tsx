import type { FormEvent } from 'react';
import styles from './SearchBar.module.css';

/** Same limit as the backend's `q` validation. */
export const MAX_QUERY_LENGTH = 100;

interface SearchBarProps {
  /** Pre-fills the input (e.g. the current ?q=). Remount with a new `key` to reset it. */
  readonly defaultValue?: string;
  /** Called with the trimmed query; never called for a blank query. */
  readonly onSearch: (query: string) => void;
}

export function SearchBar({ defaultValue = '', onSearch }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    const query = typeof value === 'string' ? value.trim() : '';
    if (query !== '') onSearch(query);
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="site-search" className="visually-hidden">
        Search products
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        className={styles.input}
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_LENGTH}
        placeholder="Search products"
        autoComplete="off"
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}
