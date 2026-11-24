import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppRoutes } from '../App.tsx';

/**
 * Renders the full route table at `url` in an in-memory router. Mock
 * `src/api/catalogue.ts` before calling. `currentUrl()` reads the router's
 * location directly, so tests can assert navigation without a test id.
 */
export function renderApp(url = '/') {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [url] });
  const result = render(<RouterProvider router={router} />);
  const currentUrl = () => `${router.state.location.pathname}${router.state.location.search}`;
  return { ...result, currentUrl };
}
