# backend/CLAUDE.md

These rules are in addition to the root [CLAUDE.md](../CLAUDE.md).

## Stack

- Node 24 (Active LTS), TypeScript 5.x with `strict: true`
- Fastify (HTTP), @fastify/helmet (security headers), zod (validation), nodemailer (email), pino (logging, via Fastify's logger)
- Vitest + supertest (tests)
- npm

## Architecture: layered, ports and adapters

```
src/
  domain/     types and pure logic (no I/O, no framework imports)
  ports/      interfaces: ProductSource, EmailSender
  adapters/   FakeStoreProductSource, SmtpEmailSender,
              plus in-memory/fake versions for tests
  services/   use-cases; depend only on ports and domain
  http/       routes, zod schemas, error handler
  config/     env parsing and validation
  app.ts      builds the Fastify app via dependency injection
  server.ts   loads config, wires the real adapters, starts listening
```

Dependencies point this way: `http → services → ports ← adapters`, and every layer may use `domain`. Only `app.ts` and `server.ts` know about concrete adapters.

## Rules

- The HTTP layer never imports adapters directly.
- Services depend only on ports and domain, never on adapters, Fastify or nodemailer.
- The Fake Store API (its URL and response shapes) appears only inside `FakeStoreProductSource`. That adapter validates upstream responses with zod and maps them to domain types.
- All config comes from env and is validated with zod at startup. Fail fast on invalid config.
- Validate every request (params, query, body) with zod. Errors always use the shape `{ error: { code, message, details? } }`.
- Never log customer PII from enquiries.
