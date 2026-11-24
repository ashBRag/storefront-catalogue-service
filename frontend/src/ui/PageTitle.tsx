import type { ReactNode } from 'react';
import styles from './PageTitle.module.css';

interface PageTitleProps {
  readonly children: ReactNode;
  /**
   * A line under the heading, e.g. a result count, in a polite live region so
   * screen readers announce changes. Pass '' while loading so the region already
   * exists when the text arrives (announcements are more reliable that way).
   * Omit it on pages that have no summary.
   */
  readonly summary?: ReactNode;
}

/** The page's single <h1>, with an optional summary line. */
export function PageTitle({ children, summary }: PageTitleProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{children}</h1>
      {summary !== undefined && (
        <p role="status" className={styles.summary}>
          {summary}
        </p>
      )}
    </div>
  );
}
