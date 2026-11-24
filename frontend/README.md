# Frontend

The React client for the product catalogue. It has a home page with the top-rated products, category pages, search, and product pages with an enquiry form.
It talks only to our backend, at `/api` on the same origin, and never to the Fake Store API.
Styling lives in one swappable layer (`src/ui`), driven by design tokens, so the look and feel can change without touching any page logic.

Back to the [root README](../README.md) for the backend, Docker and configuration.

## Tech choices

| Choice | Why |
|---|---|
| **React 19 + TypeScript (strict)** | Typed components and a typed API client. The response types in `src/types` mirror the API contract in [docs/PLAN.md](../docs/PLAN.md), so a contract mismatch shows up as a type error. Both apps use TypeScript strict mode. |
| **Vite** | Fast dev server with a built-in proxy (which keeps the API same-origin, so there's no CORS), and a simple static build. Scaffolded from the official `react-ts` template, then trimmed. |
| **React Router** | Real URLs for every page (`/categories/men's%20clothing`, `/search?q=bag`), so they can be bookmarked and shared, and back/forward works. |
| **Plain CSS Modules + design tokens** | The look and feel isn't decided yet. Tokens and plain CSS are the cheapest thing to replace later, there's no framework to learn or remove, and Tailwind (or anything else) can replace `src/ui` later without touching pages. |
| **No other libraries** | No UI kit, CSS framework, state library or data-fetching library. `fetch`, React state and one small hook (`useAsync`) are enough at this size. |

## Run locally

Needs Node 24 or later, and the backend running on port 3000. Start the backend with `docker compose up` from the repo root, or with `npm run dev` in `backend/` (see the [root README](../README.md#run-it-under-10-minutes)).

```sh
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

**How the proxy works:**
- The browser only ever calls `http://localhost:5173/api/...`.
- Vite's dev server forwards every `/api` request to the backend at `API_PROXY_TARGET`. The default is `http://localhost:3000`. It can be set in the repo-root `.env` (see `.env.example`) or the environment, e.g. `API_PROXY_TARGET=http://localhost:3001 npm run dev`.
- Because the browser sees one origin, the backend needs no CORS.
- `API_PROXY_TARGET` is read only by the dev server and never reaches the browser bundle.
- If the backend isn't running, the proxy answers `/api` with a 502 and pages show their error state with a **Try again** button.

`npm run preview` serves the production build on http://localhost:4173 and uses the same `/api` proxy.

## Run with Docker

From the repo root (copying `.env.example` to `.env` is optional):

```sh
docker compose up --build
```

Open **http://localhost:8080**. The `web` service builds `frontend/Dockerfile`:
- a `node:24-alpine` stage runs `npm ci` and `npm run build`;
- an `nginx:alpine` stage serves `dist/` using [`nginx.conf`](nginx.conf).

nginx:
- falls back to `index.html` for client-side routes, so deep links and refresh work;
- caches hashed `/assets/*` files for a year and sends `no-cache` for everything else;
- adds security headers to pages and assets ([`nginx-security-headers.conf`](nginx-security-headers.conf));
- proxies `/api/` to `http://api:3000`. It overwrites `X-Forwarded-For` with the client address, so the backend's per-IP enquiry rate limit can't be dodged with a fake header.

`web` starts once `api` is healthy. Enquiry emails show up in Mailpit at http://localhost:8025.

## Scripts

Run from `frontend/`.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173, with hot reload and the `/api` proxy |
| `npm run build` | Type-checks (`tsc -b`), then builds static files into `dist/` |
| `npm run preview` | Serves `dist/` on http://localhost:4173, with the same `/api` proxy |
| `npm test` | Vitest + React Testing Library + user-event in jsdom. The API is mocked, so it needs no backend. |
| `npm run typecheck` | `tsc -b` across the app, the Vite config and `tests/` |

There is no lint script. Like the backend, the frontend relies on TypeScript strict mode and tests only (see "Do not build" in [docs/PLAN.md](../docs/PLAN.md)).

## Folder structure

```
frontend/
  index.html
  vite.config.ts        dev proxy (/api → API_PROXY_TARGET) and test setup
  src/
    main.tsx            entry: loads the global stylesheets, renders <App>
    App.tsx             routes: /, /categories/:category, /search, /products/:id, and a catch-all "Page not found"
    Layout.tsx          loads categories and handles search navigation; renders ui/AppShell
    paths.ts            builds in-app URLs (the only place route params are encoded)
    site.ts             SITE_NAME
    api/                the only code that calls fetch
      client.ts           request() and ApiError (typed backend errors, network errors, aborts)
      catalogue.ts        one function per endpoint
      errors.ts           userMessage(): what is safe to show customers
    types/              response types mirroring the API contract
    hooks/              useAsync (loading, error, data and abort), useDocumentTitle
    pages/              HomePage, CategoryPage, SearchPage, ProductPage, NotFoundPage: data and state only
    enquiry/            enquiry validation (mirrors backend rules), useEnquiryForm, EnquiryPanel
    ui/                 THE UI LAYER: every styled component, its CSS Module, and the tokens
      index.ts            the only way into src/ui
      styles/tokens.css   design tokens
      styles/global.css   reset, focus outline, .visually-hidden
    test/               test helpers (renderApp, API mock defaults, cleanup)
  tests/
    uiBoundary.test.ts  fails if styling appears outside src/ui
```

Tests sit next to the code as `*.test.ts(x)`.

## Changing the look and feel

- **Re-theme:** edit [`src/ui/styles/tokens.css`](src/ui/styles/tokens.css). Every colour, spacing step, font, radius, shadow and layout size comes from a CSS variable there. No component hard-codes a colour.
- **Restyle components:** edit the CSS Modules in `src/ui/`. Pages and `Layout.tsx` have no `className`, `style` or CSS imports; `tests/uiBoundary.test.ts` enforces that.
- **Replace the styling approach** (e.g. Tailwind):
  1. Rewrite the components in `src/ui` behind the same names and props.
  2. Map `tokens.css` into the new theme.
  3. Delete the CSS Modules.

  Pages, API code and hooks don't change. See `docs/PLAN.md` → Assumptions.
- **Breakpoint:** there is one, `40rem`, documented at the top of `tokens.css`. CSS variables can't be used inside `@media`, so it's written out where it's used.

## How it talks to the backend

- **Only `/api` on the same origin.** All calls go through `src/api/catalogue.ts` → `request()` in `src/api/client.ts`. Pages and components never call `fetch`.
  - In dev, Vite forwards `/api` to the backend.
  - In Docker, nginx does (`frontend/nginx.conf`).
  - The frontend never calls the Fake Store API. Product image URLs come as-is from our backend's responses.

| Function | Endpoint |
|---|---|
| `getFeatured()` | `GET /api/products/featured` |
| `getCategories()` | `GET /api/categories` |
| `getCategoryProducts(category)` | `GET /api/categories/:category/products` (name URL-encoded) |
| `searchProducts(q)` | `GET /api/products?q=` |
| `getProduct(id)` | `GET /api/products/:id` |
| `submitEnquiry(input)` | `POST /api/enquiries` |

- **Errors:**
  - A non-2xx response becomes an `ApiError` with `status`, `code`, `message` and `details`, taken from the backend's `{ error: { code, message, details? } }` shape.
  - A network failure becomes `NETWORK_ERROR` (status 0).
  - A non-JSON error page (e.g. from a proxy) becomes `UNEXPECTED_RESPONSE`.
  - Pages show the backend's message for API errors and a generic one otherwise.
- **Cancellation:** every function accepts an `AbortSignal`. `useAsync` aborts the previous request when its inputs change (e.g. a new search) or the page unmounts, and ignores late responses.
- **Nothing is cached or stored in the browser.** There's no localStorage or sessionStorage; enquiry details live only in React state while the form is open.
