import { Outlet, useNavigate, useSearchParams } from 'react-router';
import { getCategories } from './api/catalogue.ts';
import { useAsync } from './hooks/useAsync.ts';
import { searchPath } from './paths.ts';
import { AppShell, CategoryNav, SearchBar } from './ui/index.ts';

/** Wires data and navigation into the UI shell. No markup or styling of its own. */
export function Layout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentQuery = searchParams.get('q') ?? '';
  const categories = useAsync((signal) => getCategories(signal), []);

  return (
    <AppShell
      // Keyed so the box shows the new query after back/forward navigation.
      search={<SearchBar key={currentQuery} defaultValue={currentQuery} onSearch={(query) => navigate(searchPath(query))} />}
      nav={
        <CategoryNav
          status={categories.status}
          categories={categories.status === 'success' ? categories.data : []}
          onRetry={categories.reload}
        />
      }
    >
      <Outlet />
    </AppShell>
  );
}
