import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { homePath } from '../paths.ts';
import styles from './AppShell.module.css';

interface AppShellProps {
  /** Rendered in the header, e.g. <SearchBar>. */
  readonly search: ReactNode;
  /** Rendered under the header row, e.g. <CategoryNav>. */
  readonly nav: ReactNode;
  /** The page. */
  readonly children: ReactNode;
}

/** Page frame: skip link, header (site name, search, nav) and main content. Presentation only. */
export function AppShell({ search, nav, children }: AppShellProps) {
  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to={homePath()} className={styles.siteName}>
            Product Catalogue
          </Link>
          <div className={styles.search}>{search}</div>
          <div className={styles.nav}>{nav}</div>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </>
  );
}
