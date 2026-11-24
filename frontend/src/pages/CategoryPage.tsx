import { Link, useParams } from 'react-router';
import { getCategoryProducts } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { userMessage } from '../api/errors.ts';
import { useAsync } from '../hooks/useAsync.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { homePath } from '../paths.ts';
import { EmptyState, ErrorMessage, PageTitle, ProductSection, Spinner, formatCategory } from '../ui/index.ts';

/** /categories/:category: the category's top rated products, then the rest. */
export function CategoryPage() {
  // Already decoded exactly once by React Router (which keeps the raw text if the
  // escapes are malformed rather than throwing). Never decode again: "100%25 cotton"
  // must reach the API as "100% cotton", not crash decodeURIComponent.
  const { category = '' } = useParams();
  const products = useAsync((signal) => getCategoryProducts(category, signal), [category]);
  const notFound = products.status === 'error' && products.error instanceof ApiError && products.error.status === 404;
  const title = notFound ? 'Category not found' : formatCategory(category);
  useDocumentTitle(title);

  return (
    <>
      <PageTitle>{title}</PageTitle>
      {products.status === 'loading' && <Spinner label={`Loading ${category}`} />}
      {notFound && (
        <EmptyState title={`We couldn't find the category “${category}”.`}>
          <p>
            <Link to={homePath()}>Go to the home page</Link>
          </p>
        </EmptyState>
      )}
      {products.status === 'error' && !notFound && (
        <ErrorMessage
          title={`Couldn't load ${category}`}
          message={userMessage(products.error)}
          onRetry={products.reload}
        />
      )}
      {products.status === 'success' &&
        (products.data.topRated.length === 0 ? (
          <EmptyState title="No products in this category yet" />
        ) : (
          <>
            <ProductSection title={`Top rated in ${category}`} products={products.data.topRated} />
            {products.data.others.length > 0 && (
              <ProductSection title={`More in ${category}`} products={products.data.others} />
            )}
          </>
        ))}
    </>
  );
}
