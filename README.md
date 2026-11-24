# storefront-catalogue-service

A proof-of-concept product catalogue API: featured products, categories, search, product details, and customer enquiries emailed to a sales inbox.
Product data comes from the [Fake Store API](https://fakestoreapi.com) today, and emails go to a local [Mailpit](https://mailpit.axllent.org) inbox. Both sit behind interfaces, so either can be swapped without touching the rest.
This README covers the backend (`backend/`). The React client lives in `frontend/` (not built yet; see [docs/PLAN.md](docs/PLAN.md)).

## Tech choices

| Choice | Why |
|---|---|
| **Node 24 + TypeScript (strict)** | One language end to end with the React client, and strict types on the API contract. Node 24 is the Active LTS. It runs `.ts` directly in dev, so there's no build step while developing. |
| **Fastify** | Small, fast, with good TypeScript types, a built-in pino logger and request ids, and a plugin model that keeps helmet and rate limiting to one line each. |
| **zod** | One way to validate everything that crosses a boundary: env config at startup, request params, query and body, and Fake Store responses. Bad input fails with a clear 400 (or a 502 for bad upstream data) instead of leaking through as `undefined`. |
| **Ports and adapters** | Services depend on `ProductSource` and `EmailSender` interfaces, not on Fake Store or nodemailer. Changing the data source or email provider means writing one adapter and wiring it in `server.ts`. Tests use in-memory adapters, with no network. |

```
http (routes, zod) → services (CatalogueService, EnquiryService) → ports ← adapters (FakeStore, SMTP, in-memory)
                                   all layers use domain (types, ranking, errors)
```

## Run it (under 10 minutes)

Configuration is optional: every setting has a safe local default. To change anything, copy the example file at the repo root first:

```sh
cp .env.example .env
```

### Option A: Docker (recommended)

Needs Docker with Compose v2.24 or later. Nothing else.

```sh
docker compose up --build
```

| What | URL |
|---|---|
| API | http://localhost:3000 (try http://localhost:3000/api/products/featured) |
| Health | http://localhost:3000/health |
| Mailpit inbox (enquiry emails) | http://localhost:8025 |

Inside the stack, `docker-compose.yml` always sets `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, `PORT=3000` and `NODE_ENV=production`, overriding `.env`. Everything else is read from `.env` if it exists.

Stop with `Ctrl+C`, or `docker compose down` if you started it with `-d`.

### Option B: Local Node

Needs Node 24 or later, npm, and Docker (only for Mailpit).

```sh
docker compose up -d mailpit   # local inbox on :1025 (SMTP) and :8025 (UI)
cd backend
npm install
npm run dev                    # http://localhost:3000, restarts on file changes
```

`npm run dev` loads `../.env` (the repo root) if it exists. The defaults already point SMTP at `localhost:1025`, which is Mailpit's mapped port.

To run the compiled build instead: `npm run build && npm start`.

## API

All responses are JSON. Errors always have the shape `{ "error": { "code", "message", "details"? } }`.

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/health` | 200 `{ "status": "ok" }` | none |
| GET | `/api/products/featured` | 200 `Product[]` (`FEATURED_COUNT`, default 5) | 502 |
| GET | `/api/categories` | 200 `string[]` | 502 |
| GET | `/api/categories/:category/products` | 200 `{ topRated: Product[], others: Product[] }` | 404 unknown category, 502 |
| GET | `/api/products?q=` | 200 `Product[]`, best-rated first | 400 missing, blank or too long `q` (max 100), 502 |
| GET | `/api/products/:id` | 200 `Product` | 400 invalid id, 404, 502 |
| POST | `/api/enquiries` | 201 `{ "ok": true }` | 400 validation, 404 unknown product, 429 rate limited, 502 email failed |

`Product` is `{ id, title, description, category, price, imageUrl, rating: { rate, count } }`.

"Top rated" everywhere means `rating.rate` descending, then `rating.count` descending, then `id` ascending.

### Examples

The responses below were captured from a running stack. Long product lists are shortened with `…`.

```sh
curl http://localhost:3000/health
# {"status":"ok"}

curl http://localhost:3000/api/categories
# ["electronics","jewelery","men's clothing","women's clothing"]

curl http://localhost:3000/api/products/featured
# [{"id":12,"title":"WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive",
#   "description":"…","category":"electronics","price":114,
#   "imageUrl":"https://fakestoreapi.com/img/61mtL65D4cL._AC_SX679_t.png",
#   "rating":{"rate":4.8,"count":400}}, …]          ← 5 products

curl "http://localhost:3000/api/categories/men's%20clothing/products"
# {"topRated":[{"id":3,"title":"Mens Cotton Jacket",…}, …],"others":[]}
# Men's clothing and jewelery have 4 products, so `others` is empty. Electronics and women's
# clothing have 6, so `others` holds 1.

curl "http://localhost:3000/api/products?q=backpack"
# [{"id":1,"title":"Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops","category":"men's clothing",
#   "price":109.95,…,"rating":{"rate":3.9,"count":120}}]

curl http://localhost:3000/api/products/1
# {"id":1,"title":"Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",…}

curl http://localhost:3000/api/products/999
# {"error":{"code":"NOT_FOUND","message":"Product 999 not found"}}            ← 404

curl http://localhost:3000/api/products/abc
# {"error":{"code":"VALIDATION_ERROR","message":"Request is invalid",
#   "details":[{"path":"id","message":"must be a positive integer"}]}}       ← 400

curl -X POST http://localhost:3000/api/enquiries \
  -H 'content-type: application/json' \
  -d '{"productId":1,"name":"Ann Lee","email":"ann@example.test","phone":"+61 400 000 000","message":"Is this waterproof?"}'
# {"ok":true}                                                                ← 201

curl -X POST http://localhost:3000/api/enquiries \
  -H 'content-type: application/json' \
  -d '{"productId":1,"name":"","email":"nope","message":"Hi"}'
# {"error":{"code":"VALIDATION_ERROR","message":"Request is invalid",
#   "details":[{"path":"name","message":"is required"},
#              {"path":"email","message":"must be a valid email address"}]}} ← 400
```

Enquiry fields:
- `productId`: required positive integer, and the product must exist.
- `name`: 1–100 characters, single line.
- `email`: a valid address.
- `phone`: optional; 6–20 digits, spaces, `+`, `-` or `()`.
- `message`: optional, up to 1000 characters.

Strings are trimmed. Enquiries are emailed only, never stored.

## Check that an enquiry email arrived

1. Send the enquiry `curl` above (or use the frontend once it exists).
2. Open **http://localhost:8025**. The newest message is titled `Product enquiry: <product title> (#<id>)`, addressed to `SALES_INBOX`, with Reply-To set to the customer.

From the terminal:

```sh
curl -s http://localhost:8025/api/v1/messages | grep -o '"Subject":"[^"]*"'
# "Subject":"Product enquiry: Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops (#1)"
```

## Tests, typecheck, lint

Run from `backend/`:

```sh
npm test            # Vitest: unit and HTTP tests on in-memory adapters (no network, no SMTP)
npm run typecheck   # tsc --noEmit, strict mode
npm run build       # compile to dist/ (what the Docker image runs)
```

There is no lint script. The PoC deliberately relies on TypeScript's strict checks only (see "Do not build" in [docs/PLAN.md](docs/PLAN.md)).

## Configuration

Every variable is optional, and a blank value counts as unset. Config is checked at startup: if anything is invalid, the API lists every problem and exits.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production`. `production` logs at `info`, otherwise `debug`. Always `production` in Docker Compose. |
| `PORT` | `3000` | Port the API listens on. Fixed to `3000` inside Docker Compose. |
| `PRODUCT_API_BASE_URL` | `https://fakestoreapi.com` | Base URL of the upstream product API (http or https). |
| `FEATURED_PRODUCT_IDS` | _(unset)_ | Comma-separated product ids for the home page, in display order, e.g. `9,1,14,3,5`. Unknown ids are skipped with a warning in the log, and the list is topped up with the best-rated products. If unset, the top-rated products are used. |
| `FEATURED_COUNT` | `5` | How many featured products to return (1–20). |
| `SMTP_HOST` | `localhost` | SMTP server. Always `mailpit` inside Docker Compose. |
| `SMTP_PORT` | `1025` | SMTP port. Port `465` uses implicit TLS; otherwise STARTTLS is used if the server offers it. Always `1025` inside Docker Compose. |
| `SMTP_USER` | _(unset)_ | SMTP username. Set both `SMTP_USER` and `SMTP_PASS`, or neither (Mailpit needs neither). |
| `SMTP_PASS` | _(unset)_ | SMTP password. Only ever put it in your untracked `.env`. |
| `MAIL_FROM` | `catalogue@example.test` | Sender address on enquiry emails. |
| `SALES_INBOX` | `sales@example.test` | Where enquiries are sent. |
| `RATE_LIMIT_MAX` | `5` | Max `POST /api/enquiries` requests per minute per client IP (1–1000). Other routes are not rate-limited. |

## Troubleshooting

**Product endpoints return 502 `UPSTREAM_ERROR`.**
The Fake Store API is down, slow (over 5 s), rate-limiting us, or returned data in an unexpected shape. Every request goes straight to Fake Store: there is no cache or retry in this PoC. The response is deliberately generic:

```
{"error":{"code":"UPSTREAM_ERROR","message":"The product service is unavailable. Please try again."}}
```

The real cause is in the API log, for example `"reason":"network"` with `Product API request failed for /products: …`. Possible reasons are `timeout`, `network`, `bad-status` (a non-2xx response such as 429 or 5xx) and `invalid-response`. To see it:
- With Docker: `docker compose logs api`.
- Locally: it's in the `npm run dev` output.

Check https://fakestoreapi.com/products in a browser. If Fake Store is rate-limiting you, wait a minute. `/health` and enquiry validation still work while it is down, because neither calls Fake Store.

**Enquiry returns 502 `EMAIL_FAILED`.**
The SMTP server isn't reachable.
- With Docker: run `docker compose ps` and check that `mailpit` is up.
- Locally: run `docker compose up -d mailpit`, and check that `SMTP_HOST` and `SMTP_PORT` in `.env` are `localhost` and `1025`.

**Enquiry returns 429 `RATE_LIMITED`.**
More than `RATE_LIMIT_MAX` enquiries were sent in a minute from your IP. Wait a minute, or raise `RATE_LIMIT_MAX` in `.env` and restart.

**Port already in use.**
- With Docker: `Ports are not available: exposing port TCP 0.0.0.0:3000 … bind: address already in use` on Docker Desktop, or `Bind for 0.0.0.0:3000 failed: port is already allocated` on Docker Engine (or the same for `8025` or `1025`).
- Locally: `EADDRINUSE: address already in use 0.0.0.0:3000`.

Find what is using the port with `lsof -i :3000` (or `ss -ltnp | grep 3000`) and stop it. A common cause is running Option A and Option B at the same time: `docker compose down` frees all three ports.
- Locally, you can also pick another port: `PORT=3001 npm run dev`.
- With Docker, change the left-hand side of the port mapping in `docker-compose.yml`, e.g. `"3001:3000"`.

**The API exits at startup with `Invalid environment configuration`.**
The message lists each bad variable, e.g. `FEATURED_PRODUCT_IDS: must be comma-separated positive integers`. Fix it in `.env`, or blank it out to use the default.

**`npm install` warns about an unsupported engine.**
The backend targets Node 24 (`node --version`). Use Node 24, or use Option A, which needs no local Node.

## More

- [docs/PLAN.md](docs/PLAN.md): spec, API contract and assumptions.
- [DECISIONS.md](DECISIONS.md): trade-offs, cuts and next steps (in progress).
