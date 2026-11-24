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
  src/api  src/types  src/components  src/pages  App.tsx  main.tsx
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
| POST | `/api/enquiries` | Enquiry form | 202 `{ "status": "accepted" }` | 400 validation, 404 unknown product, 502 email failure |
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

- **"Chosen 5 top rated" (home page):** the owner picks them with `FEATURED_PRODUCT_IDS` (comma-separated, in display order). If it is unset, the backend uses the top `FEATURED_COUNT` (default 5) by `rating.rate`, tie-broken by `rating.count`. Unknown IDs are skipped and logged.
- **Category page "top rated" vs "additional":** `topRated` is the category's top 3 by rating, using the same sort. `others` is the rest, also sorted by rating. A category with ≤ 3 products has an empty `others`.
- **Search:** case-insensitive substring match on title, description and category. `q` is trimmed, 1–100 chars. A missing or empty `q` returns 400 (the frontend never sends one). No ranking or fuzzy matching.
- **Categories:** taken from the upstream categories endpoint and matched exactly after URL decoding (e.g. `men's clothing`). An unknown category returns 404.
- **Enquiry "contact details":** `name` (1–100), `email` (valid), `phone` (optional, 6–20 chars of digits, spaces, `+`, `-`, `()`), `message` (optional, ≤ 2000), `productId` (required, must exist). No other personal data is collected.
- **Enquiry delivery:** one email to `SALES_INBOX` with `replyTo` set to the customer, and the product title and id in the subject. Locally it is delivered to Mailpit (http://localhost:8025). The API returns 202 after the SMTP send succeeds, and the frontend then shows "Thank you". A send failure returns 502 and the frontend asks the customer to try again.
- **Email provider swap:** a production provider (e.g. SES over SMTP, or an SES API adapter) is a new `EmailSender` adapter plus env config. Nothing else changes.
- **Product images:** the frontend uses the image URLs from the backend's `Product` as-is (in practice they are hosted by Fake Store).
- **Upstream timeout:** 5 s, a constant in the product adapter (not an env var). Failures return 502 and the frontend shows an error state.

## Do not build

These are cut from the PoC. Each one is listed in DECISIONS.md under "Next steps", with the reason it was cut and where it would go.

- **Caching, pagination, retries.** Every request goes straight to the upstream. A TTL cache or a retry policy would be a decorator around `ProductSource`.
- **Auth and an admin UI.** Featured products are chosen with `FEATURED_PRODUCT_IDS`.
- **Persisting enquiries.** They are only emailed. Storing them would add an `EnquiryRepository` port.
- **Customer confirmation emails.** Only the sales inbox is emailed.
- **CORS.** Not needed, because nginx and the Vite proxy forward `/api`, so the browser only talks to one origin.
- **AWS infrastructure code.** None in the repo. One line in DECISIONS.md says it is compatible: both apps are containers (ECS/App Runner) and the email adapter can point at SES.
- **Workspace tooling, extra linting and git hooks, Swagger.** Only `tsc` strict checks and tests. The API contract lives in this file.

