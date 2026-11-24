# frontend/CLAUDE.md

These rules are in addition to the root [CLAUDE.md](../CLAUDE.md).

## Stack

- React 19, TypeScript 5.x with `strict: true`, Vite (built with Node 24)
- React Router (pages)
- Plain CSS (CSS Modules). No UI kit, because the look and feel is still being designed and will be replaced.
- Vitest + React Testing Library + jsdom (tests)
- npm

## Structure

```
src/
  api/          the only module that calls the backend (fetch); typed functions per endpoint
  types/        response types, written to match the API contract in docs/PLAN.md
  components/   ProductTile, ProductGrid, CategoryNav, SearchBar, EnquiryForm
  pages/        HomePage, CategoryPage, SearchPage, ProductPage
  App.tsx       routes
  main.tsx      entry
```

## Rules

- Components and pages never call `fetch` directly. They go through `src/api`.
- Call the backend through relative `/api/...` paths. Vite's dev proxy forwards them in development, and nginx in the web container forwards them in Docker. The API is therefore same-origin.
- Never reference the Fake Store API, including its image hosts in code. Image URLs come from our backend's responses.
- Every data view handles loading, error and empty states.
- Keep styling in CSS Modules beside each component so the look and feel can be swapped without touching logic.
