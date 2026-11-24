# Product Catalogue PoC: Plan

## Goals

- Meet the five acceptance criteria: home page, category page, search, product page and enquiry.
- Build a foundation that can grow. The product source, the look and feel, and the email provider can each be swapped without touching the rest.
- Keep clear boundaries: frontend ↔ (HTTP) ↔ backend ↔ (port) ↔ product source / email provider.
- Let a reviewer run it in under 10 minutes with `docker compose up`, with no paid accounts. Enquiry emails show up in Mailpit.
- Test the critical path in both apps.
- Stay in the 2–3 hour time-box. Cut scope and record the cuts rather than overrun.

## Architecture

```
browser ──► web (nginx: static React build, proxies /api) ──► api (Fastify) ──► Fake Store API
                                                                  └──► SMTP ──► mailpit (local inbox)
```

| Service | Image / build | Port (host) |
|---|---|---|
| `web` | `frontend/Dockerfile` (Vite build on node:24-alpine → nginx) | 8080 |
| `api` | `backend/Dockerfile` (node:24-alpine) | 3000 |
| `mailpit` | `axllent/mailpit` | 8025 (inbox UI), 1025 SMTP (internal) |

## Repo layout

```
backend/            own package.json, tsconfig, Dockerfile, tests
  src/domain  src/ports  src/adapters  src/services  src/http  src/config  app.ts  server.ts
frontend/           own package.json, Vite config, Dockerfile, tests
  src/api  src/types  src/hooks  src/ui  src/pages  Layout.tsx  paths.ts  App.tsx  main.tsx
docker-compose.yml  api + web + mailpit
docs/PLAN.md        this file
README.md  DECISIONS.md  AI_USAGE.md  CLAUDE.md (root + backend/ + frontend/)  .env.example
```

The two folders share no code and talk only over HTTP. There is no workspace tooling.

## API contract

All responses are JSON. Errors use `{ "error": { "code": string, "message": string, "details"?: unknown } }`.

`Product`: `{ id: number, title: string, description: string, price: number, category: string, imageUrl: string, rating: { rate: number, count: number } }`

| Method | Path | Serves | Success | Errors |
|---|---|---|---|---|
| GET | `/api/products/featured` | Home page | 200 `Product[]` (5) | 502 upstream |
| GET | `/api/categories` | Category links | 200 `string[]` | 502 |
| GET | `/api/categories/:category/products` | Category page | 200 `{ topRated: Product[], others: Product[] }` | 404 unknown category, 502 |
| GET | `/api/products?q=` | Search | 200 `Product[]` | 400 invalid `q`, 502 |
| GET | `/api/products/:id` | Product page | 200 `Product` | 400 invalid id, 404, 502 |
| POST | `/api/enquiries` | Enquiry form | 201 `{ "ok": true }` | 400 validation, 404 unknown product, 429 rate limited, 502 email failure |
| GET | `/health` | Container health | 200 `{ "status": "ok" }` | — |

## Frontend pages

| Route | Page | Acceptance criterion |
|---|---|---|
| `/` | Featured products (5 tiles) and category links | Home page |
| `/categories/:category` | "Top rated" section, then "More in this category" | Category page |
| `/search?q=` | Search bar with a button; shows only matching results | Search |
| `/products/:id` | Details, an Enquire button, the enquiry form, then a "Thank you" message | Product page, Enquiry |

The search bar and category links appear on every page in the header.

## Build plan

Work on a feature branch, with one or more commits per step.

1. **Skeleton.** Root files (`.env.example`, `docker-compose.yml` with api + mailpit). Backend scaffold with strict tsconfig, Vitest, npm scripts and Dockerfile. Zod env config. `GET /health` with a supertest test.
2. **Backend domain and ports.** Types, pure `selectFeatured`, `splitCategory` and `matchesQuery`, the `ProductSource` and `EmailSender` ports, and the in-memory adapters. Unit tests.
3. **Backend catalogue.** `CatalogueService`, the five GET routes, zod schemas and the error handler. HTTP tests use the in-memory adapters.
4. **Fake Store adapter.** `fetch` with a timeout, zod validation of the upstream responses, and mapping to domain types. Upstream errors become 502. Tests use a stubbed `fetch`.
5. **Enquiries.** `EnquiryService`, `POST /api/enquiries`, and the `SmtpEmailSender` (nodemailer → Mailpit). Tests use the fake sender. Manually check that an email arrives in Mailpit.
6. **Frontend scaffold and browsing.** Vite + React + Router, the `src/api` client, the header (search and categories), the home page and the category page. Vite dev proxy for `/api`.
7. **Frontend search, product and enquiry.** Search page, product page, enquiry form with a thank-you message. RTL tests for the critical path, mocking `src/api`.
8. **Ship.** Web Dockerfile (nginx + `/api` proxy). Check that `docker compose up` works from a clean clone. Write README, DECISIONS.md (the "Do not build" list becomes "Next steps"), AI_USAGE.md and time spent. Open a PR into `main` with a full description.

If time runs short, cut in this order: frontend polish, then Fake Store adapter edge-case tests, then the backend 404 for unknown categories (return an empty result instead). Record whatever is cut in DECISIONS.md.

## Assumptions (edit freely)

- **"Chosen 5 top rated" (home page):** the owner picks them with `FEATURED_PRODUCT_IDS` (comma-separated, in display order). If it is unset, the backend uses the top `FEATURED_COUNT` (default 5) by rating (see "Top rated" below). Unknown and duplicate IDs are skipped (unknown ones logged as a warning), extra IDs beyond the count are dropped, and if fewer than `FEATURED_COUNT` remain the list is topped up with the best-rated other products. Fewer than the count is returned only if the whole catalogue is smaller.
- **"Top rated" ordering (used everywhere):** `rating.rate` descending, then `rating.count` descending, then `id` ascending so the order is deterministic. Pure function `rankByRating` in `backend/src/domain/ranking.ts`.
- **Category page "top rated" vs "additional":** `topRated` is the category's top 5 by rating, using the same sort. `others` is the rest, also sorted by rating. A category with ≤ 5 products has an empty `others`. (Changed from top 3 during step 3. With Fake Store's 4–6 products per category, most categories show an empty "More in this category" section.)
- **Search:** case-insensitive substring match on title, description and category. `q` is trimmed, 1–100 chars. A missing or empty `q` returns 400 (the frontend never sends one). Results are sorted by rating (same ordering). Matching uses plain `includes`, never a RegExp. No relevance ranking or fuzzy matching.
- **Categories:** taken from the upstream categories endpoint and matched exactly after URL decoding (e.g. `men's clothing`). An unknown category returns 404.
- **Enquiry "contact details":** `name` (1–100, single line), `email` (valid, ≤ 254), `phone` (optional, blank = not given, 6–20 chars of digits, spaces, `+`, `-`, `()`, at least 6 digits), `message` (optional, blank = not given, ≤ 1000; the email shows "(no message)"), `productId` (required positive integer, must exist). All strings are trimmed. No other personal data is collected. (Message history: optional ≤ 2000 in the plan, required 1–1000 in step 5, optional ≤ 1000 from step 7 so that the frontend form, which treats it as optional, and the API agree.)
- **Enquiry delivery:** one email (plain text plus simple HTML) to `SALES_INBOX` with `replyTo` set to the customer, and the product title and id in the subject. The body has product title, id and price (shown as a number with no currency symbol, because Fake Store gives none) and the customer's details. User and upstream text is HTML-escaped in the HTML body, and CR/LF are stripped from anything that goes into a header. Locally it is delivered to Mailpit (http://localhost:8025). The API returns 201 `{ ok: true }` after the SMTP send succeeds (the response the step 5 request asked for; nothing is created server-side, so 202/200 would also fit), and the frontend then shows "Thank you". A send failure returns 502 `EMAIL_FAILED` with a generic message; the real error is logged without customer details. SMTP connect timeout is 5 s, socket timeout 10 s (constants in the adapter).
- **Enquiries are not stored.** The email is the only record. This is a PoC simplification: a lost email loses the enquiry. See "Persisting enquiries" below.
- **Rate limiting:** `POST /api/enquiries` only, `RATE_LIMIT_MAX` (default 5) per minute per client IP, in-memory (per API instance; a shared store such as Redis is needed with more than one instance). Returns 429 `RATE_LIMITED`. The client IP comes from `X-Forwarded-For` only when the request comes from a loopback or private address (nginx on the Docker network); in production this should name the actual load balancer.
- **Email provider swap:** a production provider (e.g. SES over SMTP, or an SES API adapter) is a new `EmailSender` adapter plus env config. Nothing else changes.
- **Product images:** the frontend uses the image URLs from the backend's `Product` as-is (in practice they are hosted by Fake Store).
- **API errors:** one central handler. `ValidationError` → 400 `VALIDATION_ERROR` (with `details` listing field paths and messages, never the submitted values), `NotFoundError` and unknown routes → 404 `NOT_FOUND`, `UpstreamError` → 502 `UPSTREAM_ERROR` with a generic message, anything else → 500 `INTERNAL_ERROR` with a generic message in every environment. Full errors are only logged.
- **Security headers:** `@fastify/helmet` with defaults on the API. nginx is responsible for headers on the HTML pages.
- **Backend image:** multi-stage `node:24-alpine` (not `node:20-alpine` as first asked: Node 20 is end of life and `package.json` requires ≥ 24). The runtime stage has production deps and `dist/` only, runs as `node`, and has a `HEALTHCHECK` on `/health` using Node's built-in `fetch`.
- **Compose config:** `api` reads `.env` if present (`required: false`), so `docker compose up` works with or without copying `.env.example`. `NODE_ENV`, `PORT`, `SMTP_HOST` and `SMTP_PORT` are fixed in `docker-compose.yml` and win over `.env`, because inside the stack they must point at the other containers. `mailpit` uses the untagged image (latest); pin a version for repeatable builds.
- **Frontend scaffold:** from the official Vite `react-ts` template. The template now ships TypeScript 7 and oxlint; TypeScript is pinned to 5.x (repo rule) and oxlint removed (no linter, matching the backend; ESLint and Prettier were requested and declined to stay within "Do not build"). Code style follows the backend (semicolons, single quotes).
- **Frontend dev proxy:** `npm run dev` proxies `/api` to `API_PROXY_TARGET` (default `http://localhost:3000`), read from the repo-root `.env` or the environment. It is not a `VITE_` variable, so it never reaches the browser bundle.
- **Frontend API errors:** `src/api` throws `ApiError` (`status`, `code`, `message`, `details`). A network failure is `status 0`, `NETWORK_ERROR`. A non-2xx without our error shape (e.g. a proxy's HTML 502) is `UNEXPECTED_RESPONSE` with a generic message. Aborts are rethrown unchanged and ignored by `useAsync`.
- **Frontend UI is a separate, swappable layer (`frontend/src/ui`).** Every styled component, its CSS Module and the design tokens live there. Pages and `Layout` only load data, hold state and navigate: they render `src/ui` components through `src/ui/index.ts` and have no styling of their own. A test (`frontend/tests/uiBoundary.test.ts`) enforces this, because there is no linter.
  - **Planned growth path: Tailwind CSS.** CSS Modules and tokens are used for the PoC because the look and feel is still undecided and the rules allow no CSS framework.
  - To adopt Tailwind later: add it to the frontend, rewrite the `src/ui` components with utility classes behind the same names and props, delete their CSS Modules, and map `tokens.css` into Tailwind's theme (v4 `@theme` uses CSS variables, so the tokens carry over).
  - Pages, `Layout`, `api`, `hooks` and tests don't change, except for selectors in `src/ui`'s own tests. This goes into DECISIONS.md under "How the design supports growth".
- **Prices:** shown as US dollars (`PRICE_CURRENCY = 'USD'` in `frontend/src/ui/format.ts`) with a fixed `en-US` locale, because Fake Store and our contract carry no currency. Changing currency is a one-constant change.
- **Product tiles:** the whole tile is one link to `/products/:id`. Its accessible name is the title, price and rating; the image (alt = title) is left out of the name so screen readers don't hear the title twice. The image box has a fixed aspect ratio (no layout shift), and titles are clamped to 2 lines visually, with the full title still in the accessible name.
- **Home page:** one `<h1>` "Top rated" over the featured products, in the order and number the backend returns (no frontend sorting or slicing). Loading, error (with Try again) and empty states. The tab title is "Top rated | Product Catalogue". Error text is the backend's message for API errors (written for customers), or a generic message otherwise.
- **Category page:** `<h1>` is the category name with its first letter capitalised ("Men's clothing"). Then a "Top rated in {category}" section and a "More in {category}" section, the second hidden when `others` is empty. A 404 shows "Category not found" with a link home; other errors show the message with Try again. The route param is decoded once by React Router (which keeps the raw text on a malformed escape instead of throwing) and never decoded again, so `100% cotton` reaches the API unchanged.
- **Search page:** the URL's `q` is the source of truth; the page trims it, and the header search bar reads and writes it. A missing or blank `q` shows "Enter a search term" and makes no API call. Otherwise the `<h1>` is "Search results", with a live-region line "N results for “q”" (singular for 1), then the grid in backend order, or "No products match “q”". A 400 shows a fixed friendly message (1–100 characters) with no retry; other errors show Try again. Changing `q` aborts the in-flight request and ignores its late response. Queries are only ever rendered as React text, never as HTML.
- **Product grid layout:** 2 columns on phones. From 40rem, as many 12rem-minimum columns as fit, which gives 5 across at the content width, so the 5 featured products sit on one row.
- **Frontend shell:** the header shows the site name, search bar and category links on every page. If categories fail to load, the header shows "Categories are unavailable right now" with a Retry button, and the rest of the page still works. The search bar trims input, ignores a blank query, and is capped at 100 characters like the backend.
- **Category URLs:** built only by `src/paths.ts` (`encodeURIComponent`) and decoded by React Router's `useParams`. Tested round-trip with spaces, apostrophes, quotes, `%`, `/`, `?` and `#`.
- **Loading indicator:** `Spinner` is static (an icon plus "Loading…" text in a `role="status"` region), because animations are out of scope.
- **Upstream timeout:** 5 s, a constant in the product adapter (not an env var). Failures return 502 and the frontend shows an error state.

## Do not build

These are cut from the PoC. Each one is listed in DECISIONS.md under "Next steps", with the reason it was cut and where it would go.

- **Caching, pagination, retries.** Every request goes straight to the upstream. A TTL cache or a retry policy would be a decorator around `ProductSource`.
- **Auth and an admin UI.** Featured products are chosen with `FEATURED_PRODUCT_IDS`.
- **Persisting enquiries.** They are only emailed. Storing them would add an `EnquiryRepository` port.
- **Customer confirmation emails.** Only the sales inbox is emailed.
- **CORS.** Not needed, because nginx and the Vite proxy forward `/api`, so the browser only talks to one origin. (Asked for in step 3 and deliberately skipped. Add `@fastify/cors` with an explicit `CORS_ORIGIN` allow-list only if the frontend moves to its own origin.)
- **AWS infrastructure code.** None in the repo. One line in DECISIONS.md says it is compatible: both apps are containers (ECS/App Runner) and the email adapter can point at SES.
- **Workspace tooling, extra linting and git hooks, Swagger.** Only `tsc` strict checks and tests. The API contract lives in this file.

