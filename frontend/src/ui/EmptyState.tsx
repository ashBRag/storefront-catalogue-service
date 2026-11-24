import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  readonly title: string;
  readonly message?: string;
  /** Optional follow-up, e.g. a link back home. */
  readonly children?: ReactNode;
}

export function EmptyState({ title, message, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {message !== undefined && <p>{message}</p>}
      {children}
    </div>
  );
}
