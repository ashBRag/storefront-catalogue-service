# frontend/CLAUDE.md

These rules are in addition to the root [CLAUDE.md](../CLAUDE.md). The spec, pages and API contract are in [docs/PLAN.md](../docs/PLAN.md).

## Stack

- React 19, TypeScript 5.x with `strict: true`, Vite (built with Node 24)
- React Router (pages)
- Plain CSS: CSS Modules beside each UI component, with design tokens in `src/ui/styles/tokens.css`
- Vitest + React Testing Library + `@testing-library/user-event` + jsdom (tests)
- No linter or formatter: strict `tsc` and tests only, matching the backend
- npm

**Not allowed:** UI component libraries, CSS frameworks (e.g. Tailwind; it is a possible future swap of `src/ui`, see below, not something to mix in), state libraries (e.g. Redux, Zustand), and data-fetching libraries (e.g. React Query, SWR, axios). React state and `fetch` are enough at this size. Ask before adding any package not listed above.

## Structure

```
src/
  api/          typed client: the only module that calls fetch; one function per endpoint
  hooks/        useAsync (loading, error and data state, with abort on change or unmount)
  types/        response types mirroring the API contract in docs/PLAN.md
  ui/           THE UI LAYER: every styled component and its CSS Module, plus styles/
    styles/     tokens.css (design tokens) and global.css (reset, focus, utilities)
    index.ts    the only entry point into src/ui
  pages/        HomePage, CategoryPage, SearchPage, ProductPage, NotFoundPage: data and state, no styling
  Layout.tsx    loads categories, handles search navigation, renders ui/AppShell
  paths.ts      builds in-app URLs (encodes route params)
  App.tsx       routes
  main.tsx      entry; loads the global stylesheets
tests/          repo-level checks that need Node (e.g. the UI boundary guard)
```

## Architecture

- **UI is a separate, swappable layer.** All markup that carries styling lives in `src/ui`: components such as `AppShell`, `SearchBar`, `CategoryNav`, `Spinner`, `ErrorMessage`, `EmptyState`, and later `ProductGrid`, `ProductTile` and `EnquiryForm`.
  - Pages and `Layout` hold data, state and navigation. They render `src/ui` components with props and callbacks, and contain no `className`, `style` or CSS imports.
  - Pages import `src/ui` only through `src/ui/index.ts`.
  - `src/ui` never calls `src/api`. It may use React Router links and `paths.ts`.
  - `tests/uiBoundary.test.ts` enforces these rules.
  - If a page needs new markup, add or extend a `src/ui` component rather than styling the page.
- Only `src/api` calls `fetch`. Pages and the app layout load data by calling `src/api` functions. Components get data and callbacks through props and never call `fetch`.
- `src/api` throws a typed error for non-2xx responses, built from the backend's `{ error: { code, message, details? } }` shape. Pages decide how to show it.
- Types in `src/types` mirror the backend contract in `docs/PLAN.md`. They are duplicated on purpose (no shared package, per the root rules). If the contract changes, update `docs/PLAN.md` and both sides.
- Call the backend only through relative `/api/...` paths on the same origin. Vite's dev proxy forwards them in development, and nginx forwards them in the web container. No CORS, and no API base-URL config.
- Never call or reference the Fake Store API, including its image hosts. Image URLs come as-is from our backend's responses.

## Look and feel (must be swappable)

- All colours, spacing, font families and sizes, radii, shadows and borders come from CSS custom properties defined in `src/styles/tokens.css`.
- No hard-coded colours (hex, `rgb()`, named colours) or raw spacing values in components or CSS Modules. If a value is missing, add a token.
- Reskinning means editing `tokens.css`. A bigger change means rewriting `src/ui` behind the same component names and props, and never touching pages, `api` or `hooks`.
- **Swapping to Tailwind later:** rewrite the components in `src/ui` with utility classes, delete their CSS Modules, and map `tokens.css` into Tailwind's theme (Tailwind v4's `@theme` is built on CSS variables, so the tokens carry over). Nothing outside `src/ui` and `main.tsx` changes.
- Media-query breakpoints are the one exception, because CSS variables don't work inside `@media`. Keep them few and documented in `tokens.css`.

## Quality

- No `any`: use `unknown` and narrow it. Response JSON becomes typed data in exactly one place, `request()` in `src/api/client.ts`, which trusts our own backend (it validates its data). Nothing else casts response data.
- Every page that loads data handles **loading**, **error** (with a way to retry or go back) and **empty** states. An unknown product or category (404) gets a "not found" message, not a generic error.
- Accessible by default:
  - Semantic HTML (`header`, `nav`, `main`, headings in order, lists for product grids).
  - Every input has a `<label>`, and validation errors are announced and linked with `aria-describedby`.
  - Meaningful `alt` text on product images.
  - Visible focus styles (never remove an outline without a replacement).
  - Links (`<Link>`/`<a>`) for navigation, `<button>` for actions. Never a clickable `div`.
- Tests use React Testing Library queries by role or label, and `user-event` for interactions. Page and component tests mock `src/api`, not `fetch`. Only `src/api`'s own tests stub `fetch`.

## Out of scope: do not build

Auth, a caching library, pagination, cart or checkout, i18n, animations or transitions, SSR, and global state (Context stores, state libraries). If one of these seems necessary for a task, stop and say so rather than adding it.

## Working agreement

- Make small, commit-sized changes.
- Flag every assumption. If it affects behaviour, add it to Assumptions in `docs/PLAN.md`.
- After each task, explain the trade-offs briefly.
