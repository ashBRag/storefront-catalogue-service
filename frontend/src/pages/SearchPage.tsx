import { useSearchParams } from 'react-router';

/** Placeholder: results come in a later step. */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  return <h1>{query === '' ? 'Search' : `Results for “${query}”`}</h1>;
}
