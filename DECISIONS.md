# Decisions

> Draft. The assumptions and growth sections are filled in from `docs/PLAN.md` at the end of the build.

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
