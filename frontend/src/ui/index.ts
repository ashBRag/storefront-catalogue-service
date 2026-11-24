// The UI layer: every component that renders styled markup, plus the design tokens.
// Pages and Layout import from here only, and pass data and callbacks as props.
// Swapping the look and feel (e.g. CSS Modules → Tailwind) means rewriting src/ui
// behind these same component names and props; nothing outside src/ui changes.

export { AppShell } from './AppShell.tsx';
export { CategoryNav } from './CategoryNav.tsx';
export { EmptyState } from './EmptyState.tsx';
export { ErrorMessage } from './ErrorMessage.tsx';
export { formatCategory, formatPrice, PRICE_CURRENCY } from './format.ts';
export { PageTitle } from './PageTitle.tsx';
export { ProductGrid } from './ProductGrid.tsx';
export { ProductSection } from './ProductSection.tsx';
export { ProductTile } from './ProductTile.tsx';
export { SearchBar, MAX_QUERY_LENGTH } from './SearchBar.tsx';
export { Spinner } from './Spinner.tsx';
