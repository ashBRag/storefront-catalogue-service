import { useSearchParams } from 'react-router';
import { searchProducts } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { userMessage } from '../api/errors.ts';
import { useAsync } from '../hooks/useAsync.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { EmptyState, ErrorMessage, MAX_QUERY_LENGTH, PageTitle, ProductGrid, Spinner } from '../ui/index.ts';

/**
 * /search?q=: results for the query in the URL. The URL is the source of truth;
 * the header search bar reads and writes it. A blank query never calls the API.
 */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  useDocumentTitle(query === '' ? 'Search' : `Search: ${query}`);

  if (query === '') {
    return (
      <>
        <PageTitle>Search</PageTitle>
        <EmptyState title="Enter a search term" message="Use the search box above to find products by name, description or category." />
      </>
    );
  }
  return <SearchResults query={query} />;
}

/**
 * Mounted only for a non-blank query. useAsync re-runs when the query changes and
 * aborts the previous request, so a slow old response can't replace newer results.
 */
function SearchResults({ query }: { readonly query: string }) {
  const results = useAsync((signal) => searchProducts(query, signal), [query]);

  // Text is rendered by React, which escapes it: a query like <script> shows as typed.
  const summary = results.status === 'success' ? resultCount(results.data.length, query) : '';

  return (
    <>
      <PageTitle summary={summary}>Search results</PageTitle>
      {results.status === 'loading' && <Spinner label={`Searching for “${query}”`} />}
      {results.status === 'error' && <SearchError error={results.error} onRetry={results.reload} />}
      {results.status === 'success' &&
        (results.data.length === 0 ? (
          <EmptyState title={`No products match “${query}”`} message="Check the spelling, or try a shorter or more general term." />
        ) : (
          <ProductGrid products={results.data} headingLevel={2} />
        ))}
    </>
  );
}

function SearchError({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 400) {
    // Retrying the same query can't help, so no retry button.
    return (
      <ErrorMessage
        title="We can't search for that"
        message={`Search terms must be between 1 and ${MAX_QUERY_LENGTH} characters. Please try a shorter search.`}
      />
    );
  }
  return <ErrorMessage title="Search failed" message={userMessage(error)} onRetry={onRetry} />;
}

function resultCount(count: number, query: string): string {
  return `${count} ${count === 1 ? 'result' : 'results'} for “${query}”`;
}
