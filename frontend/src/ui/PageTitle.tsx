import type { ReactNode } from 'react';
import styles from './PageTitle.module.css';

/** The page's single <h1>. */
export function PageTitle({ children }: { readonly children: ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}
