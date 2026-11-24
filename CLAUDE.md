# CLAUDE.md

Repo-wide rules for Claude Code. The spec is in [docs/PLAN.md](docs/PLAN.md). Rules for each folder are in [backend/CLAUDE.md](backend/CLAUDE.md) and [frontend/CLAUDE.md](frontend/CLAUDE.md).

## Context

This is a take-home challenge: a product catalogue proof of concept that should be able to grow into the real product. The product data source, the look and feel, and the email provider are all expected to change. Reviewers score judgement, not feature count. Time-box: 2–3 hours.

## Layout

```
backend/            Node 24 + TypeScript API (own package.json, tsconfig, Dockerfile, tests)
frontend/           React 19 + TypeScript + Vite client (own package.json, Vite config, Dockerfile, tests)
docker-compose.yml  api + web + mailpit
docs/PLAN.md        spec and build plan
README.md           run instructions for the whole thing
DECISIONS.md        assumptions, cuts, growth path, next steps
AI_USAGE.md         tools, prompts, where the AI got it wrong
.env.example        all configuration, no secrets
```

## Repo-wide rules

- `backend/` and `frontend/` share no code and talk only over HTTP. Do not import across folders, and do not create a shared types package. The duplicated types are deliberate: the API contract in `docs/PLAN.md` is what keeps them in sync.
- Each folder has its own dependencies, build and tests. Run npm commands from inside the folder.
- No workspace tooling (npm workspaces, Nx, Turborepo, Lerna).
- Only the backend calls the Fake Store API, and only inside its product-source adapter. The frontend calls only our backend.
- No secrets in code or in git. All config goes in `.env.example`, with safe local defaults.
- Versions: Node 24 (Active LTS; Node 20 is end of life) in both folders and in every Dockerfile (`node:24-alpine`), TypeScript 5.x with `strict` in both folders, React 19 + Vite in the frontend.
- No `any` (use `unknown` and narrow).
- Keep functions small. Add no dependencies or features that weren't asked for. Ask before adding a package not listed in the folder's CLAUDE.md.
- Do not build anything listed under "Do not build" in `docs/PLAN.md` (caching, pagination, retries, auth/admin UI, persisting enquiries, confirmation emails, CORS, AWS infra code, workspace tooling, extra linting or git hooks, Swagger).
- The reviewer must be able to run everything with `docker compose up` and no paid accounts.

## Working agreement

- Work on a feature branch and make small, commit-sized changes. The final PR goes into `main` and stays open.
- After each task, write a short note on the trade-offs.
- Flag every assumption. If it affects behaviour, add it to Assumptions in `docs/PLAN.md` (it later moves into `DECISIONS.md`).
- If the AI gets something wrong and it is caught, record it briefly for `AI_USAGE.md`.
