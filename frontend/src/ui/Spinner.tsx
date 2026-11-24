import styles from './Spinner.module.css';

interface SpinnerProps {
  /** What is loading, read by screen readers, e.g. "Loading products". */
  readonly label?: string;
}

/**
 * Loading indicator. A polite live region so screen readers announce it.
 * Deliberately static: animations are out of scope (see frontend/CLAUDE.md).
 */
export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <p role="status" className={styles.spinner}>
      <span className={styles.dot} aria-hidden="true" />
      {label}…
    </p>
  );
}
