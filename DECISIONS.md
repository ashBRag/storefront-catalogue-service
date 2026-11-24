# Decisions

> Draft. The backend assumptions and growth sections are filled in from `docs/PLAN.md` at the end of the build. The [Frontend](#frontend) section is complete.

## Assumptions

_To do: copy the final list from `docs/PLAN.md` → Assumptions._

## Dropped or simplified requirements

_To do: anything cut during the build, beyond the planned next steps below._

## How the design supports growth

_To do._

## Next steps

These were cut on purpose to stay inside the 2–3 hour time-box. The design leaves a clear place for each one.

- **Caching, pagination, retries.** Add a TTL cache and a retry policy as decorators around the `ProductSource` port, so services and routes don't change. Add pagination to the list endpoints once the catalogue is bigger than Fake Store's 20 products.
- **Auth and an admin UI.** Today the owner chooses featured products with the `FEATURED_PRODUCT_IDS` env var. An admin UI needs auth and somewhere to store the choice.
- **Persisting enquiries.** Enquiries are emailed only. Storing them means adding an `EnquiryRepository` port and an adapter (e.g. Postgres or DynamoDB).
- **Customer confirmation emails.** A second email through the existing `EmailSender` port.
- **CORS.** Not needed today, because nginx (in Docker) and the Vite dev proxy forward `/api`, so the browser only talks to one origin. It would be needed if the frontend were ever served from a different origin.
- **AWS.** No infrastructure code is included. The solution is AWS-compatible: both apps are plain containers (ECS Fargate or App Runner), and SES can replace Mailpit through an SMTP or SES `EmailSender` adapter.
- **Tooling.** No workspace tooling, no linting beyond `tsc` strict checks, no git hooks and no Swagger/OpenAPI. The API contract is documented in `docs/PLAN.md`. OpenAPI is the next thing to add if the API gains more consumers.

## Frontend

Everything here refers to code under `frontend/`. Run instructions are in [frontend/README.md](frontend/README.md).

### Assumptions

- **The enquiry form is inline on the product page.** **Enquire** opens it under the details, with no modal and no separate route (`src/pages/ProductPage.tsx` → `src/enquiry/EnquiryPanel.tsx` → `src/ui/EnquiryForm.tsx`). "Thank you" replaces the form in the same place (`src/ui/EnquiryThanks.tsx`). A modal would need a focus trap. A route would need the product passed between pages, or loaded twice.
- **Prices are US dollars.** Fake Store and our API contract carry no currency, so `PRICE_CURRENCY = 'USD'` with a fixed `en-US` locale lives in one place, `src/ui/format.ts`. Every visitor (and every test) sees the same format. Changing currency is a one-constant change; per-locale formatting would need the locale passed in.
- **The backend decides how many products count as "top rated" in a category.** The category page renders `topRated` and `others` exactly as received and never slices or sorts (`src/pages/CategoryPage.tsx`). The count is `TOP_RATED_IN_CATEGORY = 5` in `backend/src/services/CatalogueService.ts`. Likewise the home page shows whatever `/api/products/featured` returns, in that order.
- **Search runs on submit, not while typing.** `src/ui/SearchBar.tsx` is a `<form role="search">`. Submitting it navigates to `/search?q=…`, and the URL is the source of truth (`src/pages/SearchPage.tsx`). Searching on submit gives one request per search, shareable URLs, and working back/forward, with no debounce logic. A blank query never calls the API.

### Simplified or dropped

- **No data-fetching library.** Four pages plus the header load data. `src/hooks/useAsync.ts` (45 lines) covers what they need: loading, error and data states, `reload()`, aborting on change or unmount, and ignoring stale responses. Caching, deduplication and background refresh would be the reasons to add React Query; none are needed while every request goes straight to the backend.
- **No pagination.** The backend returns whole lists, and Fake Store has 20 products, so `src/ui/ProductGrid.tsx` renders everything it's given.
- **No global state.** Each page owns its data through `useAsync`, and the URL carries the rest: category, search query and product id. Nothing is shared across pages except the category list, which `src/Layout.tsx` loads once for the header.
- **No cart or checkout.** It's out of scope for an enquiry-based catalogue.
- **Light theme only.** `src/ui/styles/tokens.css` defines one set of values. There is no `prefers-color-scheme` handling.
- **Tests are component and integration tests only.** There are 155 Vitest + React Testing Library tests across 13 files, covering:
  - every page's loading, error, empty and not-found states;
  - URL encoding of category names;
  - search race conditions;
  - the enquiry flow (validation, focus, double submit, server error mapping);
  - the API client, and the UI boundary.

  The API is mocked in all of them. **Missing:** end-to-end tests against a running stack, automated accessibility checks (e.g. axe), and visual regression tests. The real-browser checks during the build were manual (headless Chrome screenshots, plus one scripted run of the enquiry flow); they are not in the repo.
- **No linter or formatter**, matching the backend: TypeScript strict mode and tests only. The one rule a linter would normally enforce here, "no styling outside `src/ui`", is a test (`tests/uiBoundary.test.ts`).
- **No animations.** `src/ui/Spinner.tsx` is a static indicator with "Loading…" text in a `role="status"` region.

### How the design supports growth

- **Only `src/api` talks to the backend.**
  - `src/api/catalogue.ts` has one typed function per endpoint, all going through `request()` in `src/api/client.ts`.
  - Response types in `src/types/index.ts` mirror the contract in `docs/PLAN.md`.
  - A backend change (new fields, a new endpoint, a different base path) touches `src/api` and `src/types`, then whichever page uses the data. Components never see a URL or a `Response`.
- **New branding is a CSS change.**
  - Colours, spacing, type, radii, shadows and layout sizes are variables in `src/ui/styles/tokens.css`, and no component hard-codes a colour.
  - Bigger visual changes stay inside `src/ui`. Pages, `src/Layout.tsx`, `src/enquiry` and `src/hooks` contain no `className`, `style` or CSS imports, and `tests/uiBoundary.test.ts` fails if that changes.
  - Moving to Tailwind means rewriting `src/ui` behind the same component names and props, and mapping the tokens into Tailwind's theme.
- **UI components are presentational and reusable.**
  - Components in `src/ui` take data and callbacks as props, and are exported only through `src/ui/index.ts`. None of them call the API.
  - Many are already reused:
    - `Spinner`, `ErrorMessage` and `PageTitle` on all four data pages;
    - `EmptyState` on all five pages;
    - `ProductGrid` on home, search and (via `ProductSection`) category;
    - `Rating` in both the product tile and the product page;
    - `Button` and `FormField` in the enquiry form.
  - Logic sits beside them, not inside them: the enquiry rules in `src/enquiry/validation.ts`, the form state in `src/enquiry/useEnquiryForm.ts`.
- **Swapping the data layer is contained.**
  - `useAsync` is called in exactly five places: `src/Layout.tsx` and the four data pages in `src/pages/`.
  - Moving to React Query, or to React Router loaders, means changing those call sites. `src/api`, `src/ui` and the tests' API mocks (`src/test/mockApi.ts`) stay as they are.
  - All requests already accept an `AbortSignal`, which both of those options use.

### Trade-offs

- **Plain CSS Modules and tokens vs Tailwind or a component library.**
  - CSS Modules need no new dependency and no framework to learn or later remove. They keep the look and feel genuinely undecided, which the brief calls for.
  - The cost: more hand-written CSS (each component has its own `.module.css`), no ready-made accessible widgets, and consistency depends on discipline. The boundary test and the token rule help.
  - A component library would have been faster for forms, but its look would be hard to remove.
  - Tailwind remains the planned swap if the team prefers it (see `docs/PLAN.md` → Assumptions).
- **SPA vs SSR.**
  - This is a client-rendered SPA. Crawlers that don't run JavaScript get an empty `<div id="root">`.
  - There is no per-page `<meta name="description">` or structured product data. `useDocumentTitle` sets the tab title only after the page loads (`src/hooks/useDocumentTitle.ts`).
  - The catch-all "Page not found" route (`src/pages/NotFoundPage.tsx`) is served with HTTP 200, not 404.
  - For a public catalogue, SEO is a real concern. Server rendering (Next.js, or React Router in framework mode) would be the next step for production, and the split between `src/api`, `src/pages` and `src/ui` carries over to either.
  - An SPA was chosen here because it is simpler to build, test and serve as static files behind nginx within the time-box.

### Accessibility

**Done** (all covered by tests unless noted):

- **Landmarks and structure:**
  - `<html lang="en">`, a "Skip to content" link, and `header`, `nav aria-label="Categories"` and `main`.
  - One `<h1>` per page. Product sections use `<h2>` with tile titles as `<h3>` (`src/ui/ProductSection.tsx`); the home page uses `<h2>` tiles.
  - Product grids are lists.
- **Links vs buttons:**
  - Navigation uses links: every product tile is one link (`src/ui/ProductTile.tsx`), and so are the category links.
  - Actions use `<button>`: search, Enquire, send, cancel, try again and retry.
  - The current category link gets `aria-current="page"` from React Router's `NavLink`.
- **Images:** product images have `alt` set to the product title. Inside a tile, the link's accessible name is the title, price and rating (via `aria-labelledby`), so the title isn't read twice.
- **Forms** (`src/ui/FormField.tsx`, `src/ui/EnquiryForm.tsx`):
  - Every input has a `<label>`, optional fields say "(optional)", and required ones have `aria-required`.
  - Hints and errors are linked with `aria-describedby`, and invalid fields get `aria-invalid`.
  - The search input has a visually hidden label.
- **Focus:**
  - **Opening the form** moves focus to Name, and **Cancel** returns it to Enquire.
  - **A failed submit** focuses the first invalid field.
  - **"Thank you"** takes focus.
  - **Every interactive element** gets a visible `:focus-visible` outline (`src/ui/styles/global.css`).
- **Live regions:** loading indicators and the search result count use `role="status"`, and errors use `role="alert"`.
- **Contrast** (computed from the tokens, not tested automatically): all text and background pairs are at least 5.4:1. Examples: muted text on the header 5.7:1, rating colour 5.4:1, error text 6.05:1, button text 6.29:1.

**Left to do:**

- **The focus ring is too faint.** `--color-focus` (`#f5a623`) against white is 2.03:1, below WCAG's 3:1 for focus indicators. This is a token fix in `src/ui/styles/tokens.css`.
- **Input borders are too faint.** `--color-border` (`#d0d7de`) against white is 1.45:1, below the 3:1 that form-control boundaries need. Also a token fix.
- **No error summary at the top of the enquiry form.** Focus jumps to the first invalid field instead. A summary with links to each field would help with several errors.
- **No automated accessibility checks** (axe in tests or CI), and no testing with a real screen reader (NVDA, VoiceOver). All checks so far are role and label queries in tests, plus screenshots.
- **The tab title updates after load,** but focus is not moved and nothing is announced on route changes. Screen reader users get no cue that a new page has loaded, beyond the loading status.
- **Images have no `width`/`height` attributes or responsive `srcset`.** Layout stability comes from the CSS aspect-ratio box instead, and Fake Store only offers one image size anyway.

### Next, with another day

1. **Ship the frontend container.** Add `frontend/Dockerfile` (Vite build, then nginx) with an nginx config that:
   - serves `index.html` for every client route;
   - proxies `/api` to `api:3000` with `X-Forwarded-For`, so the backend's enquiry rate limit sees real client IPs.

   Then uncomment `web` in `docker-compose.yml`, so `docker compose up` serves the whole app on http://localhost:8080. This is the one remaining step of the build plan.
2. **Fix the two contrast tokens above,** and add axe checks to the page tests.
3. **Add an error boundary** around the routes in `src/App.tsx`. There isn't one today, so an unexpected rendering error would blank the page instead of showing `ErrorMessage`.
4. **Add one end-to-end test** (e.g. Playwright against `docker compose up`): home → category → product → enquiry, then confirm the email arrived through Mailpit's API. That's the acceptance path, run for real.
5. **Basic SEO without SSR:**
   - a per-page meta description alongside `useDocumentTitle`;
   - nginx returning 404 for unknown product and category URLs.

   Then decide between SSR and a framework before going public.
6. **Focus management on route change:** move focus to the new page's `<h1>` after navigation.
