import { useEffect } from 'react';
import { SITE_NAME } from '../site.ts';

/** Sets the browser tab title to "<title> | <site name>" while the page is shown. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`;
  }, [title]);
}
