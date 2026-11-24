import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './Layout.tsx';
import { CategoryPage } from './pages/CategoryPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { ProductPage } from './pages/ProductPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';

/** Route table. Rendered inside a router (BrowserRouter in the app, MemoryRouter in tests). */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:category" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
