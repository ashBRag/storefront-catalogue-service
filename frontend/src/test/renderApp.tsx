import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../App.tsx';

/** Exposes the current URL to tests. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** Renders the full route table at `url`. Mock `src/api/catalogue.ts` before calling. */
export function renderApp(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}
