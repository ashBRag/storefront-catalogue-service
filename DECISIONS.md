# Decisions

Decisions, assumptions and cuts for the whole repo. The backend and shared ones come first; frontend-specific ones are in [Frontend](#frontend). The full working log of assumptions, including how each one changed during the build, is in [docs/PLAN.md](docs/PLAN.md) → Assumptions.

## Assumptions

### Interpreting the brief

- **"The chosen 5 top rated" products (home page)** are picked by the owner with `FEATURED_PRODUCT_IDS` (comma-separated, in display order).
  - If it's unset, the backend uses the best-rated `FEATURED_COUNT` (default 5).
  - Unknown and duplicate ids are skipped (unknown ones logged as a warning), extra ids are dropped, and a short list is topped up by rating.
  - Logic: `CatalogueService.getFeatured()` in `backend/src/services/CatalogueService.ts`.
- **"Top rated" means one ordering everywhere:** `rating.rate` descending, then `rating.count`, then `id` ascending so the order is deterministic. It's the pure function `rankByRating` in `backend/src/domain/ranking.ts`.
- **On a category page, "top rated" is the top 5,** and "additional" is the rest, also by rating (`TOP_RATED_IN_CATEGORY = 5`). The plan said 3, and the build request said 5. Fake Store categories have 4–6 products, so most show nothing under "More in…", and "top rated" includes low-rated items. Changing it is one constant.
- **Search** is a case-insensitive substring match on title, description and category.
  - The query is trimmed and must be 1–100 characters; otherwise it's a 400.
  - Matching uses plain `includes`, never a RegExp built from user input.
  - Results are ordered by rating, not relevance.
- **Categories** come from the upstream categories endpoint and are matched exactly. An unknown category is a 404.
- **"Contact details" for an enquiry:**
  - `name` (required, 1–100 characters, one line);
  - `email` (required, valid, up to 254 characters);
  - `phone` (optional: 6–20 digits, spaces, `+`, `-` or `()`, with at least 6 digits);
  - `message` (optional, up to 1000 characters).

  Nothing else is collected. The message rule changed twice during the build: optional in the plan, required in step 5, then optional again, so the API and the frontend form agree.
- **"Send an enquiry" means one email to the sales inbox** (`SALES_INBOX`), with `replyTo` set to the customer and the product title, id and price in it. The API answers 201 `{ ok: true }` only after the SMTP server accepts the message. The build request asked for 201; since nothing is created server-side, 202 or 200 would also fit.
- **Prices have no currency in the data.** The email shows the plain number; the frontend assumes USD (see [Frontend](#frontend)).

### Running it

- **A reviewer has Docker and nothing else.** `docker compose up --build` runs everything, with or without `.env`. In-stack settings (`SMTP_HOST=mailpit`, `PORT`, `NODE_ENV`) are fixed in `docker-compose.yml`, so a copied `.env.example` can't break them. Verified from a clean copy of the repo.
- **Mailpit stands in for a real email provider,** so no paid account is needed. Enquiries appear at http://localhost:8025.
- **Node 24 in every image and package.** It is the Active LTS, and Node 20 is end of life. One build request asked for `node:20-alpine`; it was changed to `node:24-alpine`, because `package.json` requires Node 24 or newer.

## Dropped or simplified requirements

Nothing on the plan's "cut if short of time" list was cut: frontend polish, the Fake Store adapter's edge-case tests, and the 404 for unknown categories are all in. These were simplified on purpose:

- **Enquiries aren't stored.** The email is the only record, so a lost email loses the enquiry (`EnquiryService` in `backend/src/services/EnquiryService.ts`).
- **The rate limit is in memory and per instance.**
  - `@fastify/rate-limit` allows `RATE_LIMIT_MAX` (default 5) enquiries per minute per IP on `POST /api/enquiries` only.
  - Behind nginx, the client IP comes from `X-Forwarded-For`, trusted only from private or loopback addresses (`trustProxy` in `backend/src/app.ts`).
  - Behind Docker Desktop's port mapping, every browser on the host shares one address. In production, the trusted proxy should be the real load balancer.
- **Every request goes straight to Fake Store.** There's no cache and no retry. A category page makes two upstream calls (categories and products). The adapter times out after 5 s, and any upstream failure becomes a generic 502 (`backend/src/adapters/FakeStoreProductSource.ts`).
- **Errors shown to customers are generic for anything unexpected.**
  - A 500 says "Something went wrong."
  - A 502 never includes upstream URLs or SMTP details; the real cause is logged, as the `cause` for email failures.
  - Customer details are never logged (checked in the container logs).
- **No CORS.** It was asked for at one point and deliberately skipped, because nginx and the Vite proxy keep the browser on one origin (see [Next steps](#next-steps)).
- **No linter, formatter or git hooks** in either app. ESLint and Prettier were asked for at one point and declined, to stay within "Do not build". Both apps rely on TypeScript strict mode and tests.
- **Base images aren't pinned to a version:** `axllent/mailpit` and `nginx:alpine` are untagged. That's fine for a demo, but builds aren't fully repeatable.
- **Tests:** 111 backend tests (Vitest + supertest on in-memory adapters) and 155 frontend tests. There are no end-to-end tests in the repo. The full Docker path was verified by hand during the build: headless Chrome through home, category, search and enquiry, then the email checked through Mailpit's API.

## How the design supports growth

- **Ports and adapters in the backend** (`backend/src/`). The direction is `http → services → ports ← adapters`. Services depend only on `ProductSource` and `EmailSender` (`ports/`), never on Fake Store, nodemailer or Fastify. Only `app.ts` and `server.ts` know about concrete adapters.
  - **New product data source:** write one new `ProductSource` adapter and wire it in `server.ts`. Fake Store's URL and response shapes exist only in `FakeStoreProductSource`, which validates them with zod and converts them to the `Product` type in `domain/product.ts`.
  - **New email provider (e.g. SES):** an SES-over-SMTP setup is just config (`SMTP_*`). An SES API client is one new `EmailSender` adapter.
  - **Caching and retries** can be added later as decorators that wrap `ProductSource`, so services and routes don't change.
- **Business rules are pure and tested on their own:** ranking (`domain/ranking.ts`), the enquiry email builder with HTML escaping and header-injection stripping (`services/enquiryEmail.ts`), and validation (`http/schemas.ts`). The in-memory adapters (`adapters/InMemory*.ts`) let services and HTTP routes be tested without a network.
- **One validated config.** Every setting comes from env vars, checked by zod at startup with every problem reported at once (`config/env.ts`), and documented with safe defaults in `.env.example` and the README.
- **One API contract** (`docs/PLAN.md` → API contract) and one error shape, `{ error: { code, message, details? } }`. The frontend's types (`frontend/src/types/index.ts`) are a deliberate copy of that contract: no shared package. OpenAPI is the next step if more clients appear.
- **Both apps are plain containers** with health checks, so they deploy as-is to ECS Fargate or App Runner. The frontend is static files plus a small nginx config.
- **Frontend:** see [Frontend → How the design supports growth](#how-the-design-supports-growth-1). In short: only `src/api` talks to the backend, the look and feel is tokens plus a swappable `src/ui` layer, and the data-fetching hook is used in five places.

## Next steps

These were cut on purpose to stay inside the 2–3 hour time-box. The design leaves a clear place for each one.

- **Caching, pagination, retries.** Add a TTL cache and a retry policy as decorators around the `ProductSource` port, so services and routes don't change. Add pagination to the list endpoints once the catalogue is bigger than Fake Store's 20 products.
- **Auth and an admin UI.** Today the owner chooses featured products with the `FEATURED_PRODUCT_IDS` env var. An admin UI needs auth and somewhere to store the choice.
- **Persisting enquiries.** Enquiries are emailed only. Storing them means adding an `EnquiryRepository` port and an adapter (e.g. Postgres or DynamoDB).
- **Customer confirmation emails.** A second email through the existing `EmailSender` port.
- **CORS.** Not needed today, because nginx (in Docker) and the Vite dev proxy forward `/api`, so the browser only talks to one origin. It would be needed if the frontend were ever served from a different origin.
- **AWS.** No infrastructure code is included. The solution is AWS-compatible: both apps are plain containers (ECS Fargate or App Runner), and SES can replace Mailpit through an SMTP or SES `EmailSender` adapter.
- **Tooling.** No workspace tooling, no linting beyond `tsc` strict checks, no git hooks and no Swagger/OpenAPI. The API contract is documented in `docs/PLAN.md`. OpenAPI is the next thing to add if the API gains more consumers.

Found during the build, beyond the plan's list:

- **Make the trusted proxy configurable for production.** `trustProxy` in `backend/src/app.ts` trusts any private or loopback hop. That fits Docker; production should name the load balancer. Also, port 3000 is exposed directly in compose, and a direct client on a private network could set its own `X-Forwarded-For`.
- **Move the rate limit to a shared store** (e.g. Redis) once there's more than one API instance.
- **Pin image versions** (`mailpit`, `nginx`) for repeatable builds.
- **Revisit the category "top rated" count** (5 vs 3) with real data. Today "top rated" is most of each category.
- **Frontend items** (error boundary, contrast fixes, end-to-end test, SEO): see [Frontend → Next, with another day](#next-with-another-day).

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
- **Focus ring and form-control edges** meet 3:1 on both white and the grey panel. Focus `#b35900` is 4.8:1 and 4.5:1. Control borders `--color-border-control` `#6e7781` are 4.6:1 and 4.2:1. Decorative borders stay light. These were found below 3:1 during the build and fixed in `src/ui/styles/tokens.css`.

**Left to do:**

- **No error summary at the top of the enquiry form.** Focus jumps to the first invalid field instead. A summary with links to each field would help with several errors.
- **No automated accessibility checks** (axe in tests or CI), and no testing with a real screen reader (NVDA, VoiceOver). All checks so far are role and label queries in tests, plus screenshots.
- **The tab title updates after load,** but focus is not moved and nothing is announced on route changes. Screen reader users get no cue that a new page has loaded, beyond the loading status.
- **Images have no `width`/`height` attributes or responsive `srcset`.** Layout stability comes from the CSS aspect-ratio box instead, and Fake Store only offers one image size anyway.

### Next, with another day

1. **Ship the frontend container.** Add `frontend/Dockerfile` (Vite build, then nginx) with an nginx config that:
   - serves `index.html` for every client route;
   - proxies `/api` to `api:3000` with `X-Forwarded-For`, so the backend's enquiry rate limit sees real client IPs.

   Then uncomment `web` in `docker-compose.yml`, so `docker compose up` serves the whole app on http://localhost:8080. This is the one remaining step of the build plan.
2. **Add axe checks** to the page tests (the contrast fixes are done).
3. **Add an error boundary** around the routes in `src/App.tsx`. There isn't one today, so an unexpected rendering error would blank the page instead of showing `ErrorMessage`.
4. **Add one end-to-end test** (e.g. Playwright against `docker compose up`): home → category → product → enquiry, then confirm the email arrived through Mailpit's API. That's the acceptance path, run for real.
5. **Basic SEO without SSR:**
   - a per-page meta description alongside `useDocumentTitle`;
   - nginx returning 404 for unknown product and category URLs.

   Then decide between SSR and a framework before going public.
6. **Focus management on route change:** move focus to the new page's `<h1>` after navigation.
