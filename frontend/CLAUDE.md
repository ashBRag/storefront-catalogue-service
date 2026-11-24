# frontend/CLAUDE.md

These rules are in addition to the root [CLAUDE.md](../CLAUDE.md). The spec, pages and API contract are in [docs/PLAN.md](../docs/PLAN.md).

## Stack

- React 19, TypeScript 5.x with `strict: true`, Vite (built with Node 24)
- React Router (pages)
- Plain CSS: CSS Modules beside each component, with design tokens in `src/styles/tokens.css`
- Vitest + React Testing Library + `@testing-library/user-event` + jsdom (tests)
- npm

**Not allowed:** UI component libraries, CSS frameworks (e.g. Tailwind), state libraries (e.g. Redux, Zustand), and data-fetching libraries (e.g. React Query, SWR, axios). React state and `fetch` are enough at this size. Ask before adding any package not listed above.

## Structure

```
src/
  api/          typed client: the only module that calls fetch; one function per endpoint
  types/        response types mirroring the API contract in docs/PLAN.md
  styles/       tokens.css (design tokens) and global base styles
  components/   ProductTile, ProductGrid, CategoryNav, SearchBar, EnquiryForm
  pages/        HomePage, CategoryPage, SearchPage, ProductPage
  App.tsx       routes and the layout (header with search and categories)
  main.tsx      entry
```

## Architecture

- Only `src/api` calls `fetch`. Pages and the app layout load data by calling `src/api` functions. Components get data and callbacks through props and never call `fetch`.
- `src/api` throws a typed error for non-2xx responses, built from the backend's `{ error: { code, message, details? } }` shape. Pages decide how to show it.
- Types in `src/types` mirror the backend contract in `docs/PLAN.md`. They are duplicated on purpose (no shared package, per the root rules). If the contract changes, update `docs/PLAN.md` and both sides.
- Call the backend only through relative `/api/...` paths on the same origin. Vite's dev proxy forwards them in development, and nginx forwards them in the web container. No CORS, and no API base-URL config.
- Never call or reference the Fake Store API, including its image hosts. Image URLs come as-is from our backend's responses.

## Look and feel (must be swappable)

- All colours, spacing, font families and sizes, radii, shadows and borders come from CSS custom properties defined in `src/styles/tokens.css`.
- No hard-coded colours (hex, `rgb()`, named colours) or raw spacing values in components or CSS Modules. If a value is missing, add a token.
- Reskinning should mean editing `tokens.css`, plus CSS Modules for layout changes, and never component logic.
- Media-query breakpoints are the one exception, because CSS variables don't work inside `@media`. Keep them few and documented in `tokens.css`.

## Quality

- No `any`: use `unknown` and narrow it. Never cast API responses blindly; the types in `src/types` describe them.
- Every page that loads data handles **loading**, **error** (with a way to retry or go back) and **empty** states. An unknown product or category (404) gets a "not found" message, not a generic error.
- Accessible by default:
  - Semantic HTML (`header`, `nav`, `main`, headings in order, lists for product grids).
  - Every input has a `<label>`, and validation errors are announced and linked with `aria-describedby`.
  - Meaningful `alt` text on product images.
  - Visible focus styles (never remove an outline without a replacement).
  - Links (`<Link>`/`<a>`) for navigation, `<button>` for actions. Never a clickable `div`.
- Tests use React Testing Library queries by role or label, and `user-event` for interactions. Mock `src/api`, not `fetch`.

## Out of scope: do not build

Auth, a caching library, pagination, cart or checkout, i18n, animations or transitions, SSR, and global state (Context stores, state libraries). If one of these seems necessary for a task, stop and say so rather than adding it.

## Working agreement

- Make small, commit-sized changes.
- Flag every assumption. If it affects behaviour, add it to Assumptions in `docs/PLAN.md`.
- After each task, explain the trade-offs briefly.
