import { getFeatured } from '../api/catalogue.ts';
import { userMessage } from '../api/errors.ts';
import { useAsync } from '../hooks/useAsync.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { EmptyState, ErrorMessage, PageTitle, ProductGrid, Spinner } from '../ui/index.ts';

const TITLE = 'Top rated';

/** Home: the featured ("chosen top rated") products. The backend decides which and in what order. */
export function HomePage() {
  useDocumentTitle(TITLE);
  const featured = useAsync((signal) => getFeatured(signal), []);

  return (
    <>
      <PageTitle>{TITLE}</PageTitle>
      {featured.status === 'loading' && <Spinner label="Loading top rated products" />}
      {featured.status === 'error' && (
        <ErrorMessage
          title="Couldn't load top rated products"
          message={userMessage(featured.error)}
          onRetry={featured.reload}
        />
      )}
      {featured.status === 'success' &&
        (featured.data.length === 0 ? (
          <EmptyState title="No products to show yet" message="Please check back soon." />
        ) : (
          <ProductGrid products={featured.data} headingLevel={2} />
        ))}
    </>
  );
}
