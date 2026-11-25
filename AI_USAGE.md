# AI usage

## Tools

- **Claude Code** (CLI, Claude Opus 5.5) in the terminal, working directly in this repo. It wrote most of the code, tests and docs, ran the commands, and committed and pushed when asked.
- **Repo rules for the AI:** [CLAUDE.md](CLAUDE.md) (repo-wide), [backend/CLAUDE.md](backend/CLAUDE.md) and [frontend/CLAUDE.md](frontend/CLAUDE.md). They set the stack, the layering, the "Do not build" list, and the working agreement: feature branch, small commits, flag assumptions, note trade-offs after each task, and log AI mistakes here. When a prompt conflicted with these files, the AI was expected to say so rather than quietly pick one.
- **Spec:** [docs/PLAN.md](docs/PLAN.md), written before any code. It holds the API contract, the build plan and the "Do not build" list; its Assumptions section was updated as decisions were made.
- **Verification tools the AI used:** Vitest, `tsc`, Docker Compose, `curl`, Mailpit's HTTP API, and headless Chrome (screenshots, plus small throwaway DevTools-protocol scripts that walked the enquiry flow). The scripts were kept outside the repo.

## How it was used

One prompt per build step, roughly following the plan. Each prompt stated the scope, the files, the behaviour and the edge cases. Each step ended with a summary, the trade-offs and the assumptions, then a commit after review. The prompts, in order (commits in `git log`):

| Step                         | Prompt (summary)                                                                                                                                | Commit(s)             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Plan and rules               | _Before this log; from the commit:_ spec, API contract, repo and folder CLAUDE.md files                                                         | `da8f427`             |
| Backend scaffold, data layer | _Before this log; from the commit messages:_ config, app factory, `/health`; the `ProductSource` port and the Fake Store and in-memory adapters | `2a9eda9`, `48903d2`  |
| Catalogue service            | `CatalogueService` with a pure ranking function; featured, categories, search and product rules                                                 | `1f5f4f0`             |
| HTTP routes                  | Five GET routes, zod validation, one error handler, helmet, CORS (CORS declined)                                                                | `d93bf6d`             |
| Enquiries                    | `EmailSender` port, SMTP and in-memory adapters, `POST /api/enquiries`, escaping, header-injection protection, rate limit                       | `627c29d`             |
| Backend Docker               | Multi-stage Dockerfile, compose with Mailpit, end-to-end check                                                                                  | `3b870f2`             |
| README                       | Run, API, config, troubleshooting; every command verified                                                                                       | `cd404dd`             |
| Frontend rules               | frontend/CLAUDE.md                                                                                                                              | `790e779`             |
| Frontend scaffold            | Vite template, typed API client, `useAsync`                                                                                                     | `4193529`             |
| App shell                    | Tokens, layout, routes, search bar, feedback components; then "keep UI separate so it can be swapped for Tailwind"                              | `28cc256`             |
| Pages                        | Tiles and grid, home, category, search, product and enquiry form                                                                                | `05b5d12` … `765702b` |
| Docs                         | Frontend README, the Frontend section of DECISIONS.md                                                                                           | `f679739`, `d5ef4bd`  |
| Frontend Docker              | nginx image, compose `web` service, clean-copy end-to-end check                                                                                 | `d967ca9`, `8131bb2`  |

The AI log below covers the session from `1f5f4f0` onwards. The steps before it (`da8f427` to `48903d2`) are not recorded here.

## Where the prompts and the repo rules disagreed

The AI flagged these instead of silently following the prompt. The outcome of each is in `docs/PLAN.md` or `DECISIONS.md`.

- **`node:20-alpine`** was requested for the backend image. The AI used `node:24-alpine`: Node 20 is end of life, `package.json` requires Node 24 or newer, and the repo rules say Node 24.
- **CORS** was requested but is on the "Do not build" list. The AI asked; it was skipped.
- **ESLint + Prettier "consistent with the backend"** were requested. The backend has neither, and extra linting is on the "Do not build" list. The AI asked; neither app has a linter.
- **New packages** not listed in the folder rules (`@fastify/helmet`) were asked about before being installed.
- **Category "top rated" count:** the plan said 3, the prompt said 5. The AI followed the prompt, updated the plan, and pointed out that most categories would then show no "More in…" items.
- **The enquiry `message`** was required by the backend (from an earlier prompt) but optional in the form prompt. The AI asked; it's now optional on both sides.
- **The Vite template now ships TypeScript 7 and oxlint.** The AI pinned TypeScript 5.x (repo rule) and removed oxlint.
- **`src/components/…`** was requested after the UI had been split into `src/ui`. The AI put the files in `src/ui` and explained why.
- **The frontend README prompt** asked for a `lint` script and `docker compose up` on :8080. Neither existed yet, so the README described what did exist until both were built.
- **The DECISIONS prompt** said "basic tests on the critical path only". There were 155 frontend tests, so the AI described what is actually missing instead: end-to-end, automated accessibility and visual tests.

## Where the AI got it wrong (and how it was caught)

Each item was caught during the build, mostly by tests, typecheck or a real run, and fixed before commit.

**Backend**

- **Wrong test data:** a category-split test used ratings above 5, so its own expectations were wrong. _Caught by:_ the failing test.
- **Type error in tests:** HTTP tests used `(await app.ready()).server`. They ran at runtime but failed `tsc`. _Caught by:_ typecheck.
- **Broken regex:** writing the header-injection code turned the `\u2028`/`\u2029` escapes into literal line-separator characters, which ended the regex literal. _Caught by:_ typecheck. Fixed by restoring the escapes.
- **Wrong Fastify assumption:** the AI expected `text/plain` bodies to be rejected with 415, but Fastify parses them, so zod returns 400. _Caught by:_ the failing test. Tests now cover 400, 415 and malformed JSON.
- **README claims that didn't hold:** that every Fake Store category has 4 products (two have 6), and the Docker Engine port-conflict message (Docker Desktop's differs). _Caught by:_ checking each claim against the live API and a real port clash before committing.

**Frontend**

- **Linter comments with no linter:** `eslint-disable` comments were written out of habit, twice (`useAsync`, `EnquiryForm`). _Caught by:_ self-review. Removed.
- **A self-contradicting rule:** the new frontend rule "mock `src/api`, not `fetch`" contradicted the API client's own tests. _Caught by:_ self-review. Reworded.
- **Missing test cleanup:** Testing Library only cleans up automatically when Vitest globals are on, and they aren't here. _Caught by:_ 19 tests failing with "multiple elements". Fixed with `src/test/setup.ts`.
- **An empty live region on every page:** `PageTitle` rendered an empty `role="status"` region everywhere. _Caught by:_ page tests that found two status regions.
- **Unmocked API calls:** some tests navigated to pages whose API calls weren't mocked, and crashed. _Caught by:_ the crashes. Fixed with shared defaults in `src/test/mockApi.ts`.
- **Lost focus on Cancel:** Cancel tried to focus **Enquire** before React had rendered it again. _Caught by:_ self-review before testing. Fixed with an effect, and covered by a test.
- **A cacheable 404:** nginx sent the year-long `immutable` cache header on a **404** for a missing asset. _Caught by:_ `curl` against the running container. Fixed by removing `always` from that header.
- **Overstated docs:** a DECISIONS draft said "five pages" (there are four plus the header) and overstated how widely two components are reused. _Caught by:_ grepping the code before committing.

- **Misaligned form fields:** the new two-column form put each error _above_ its input, so after a failed submit the Name and Email inputs no longer lined up. _Caught by:_ the screenshot after the change. Fixed by moving errors below their inputs.
- **Flaky title tests:** tests read `document.title` straight after the heading appeared, but the title is set by an effect that can run a moment later. They failed about one run in four. _Caught by:_ re-running the full suite. They now wait for the title, and six full runs in a row pass.

**False alarm, kept as a lesson:** a first screenshot of the Docker build showed empty image boxes. Rather than assume a timing issue, the AI checked in the browser: all images had loaded and nothing was blocked. The screenshot had been taken before the lazy-loaded images arrived.

## What the AI found that wasn't asked for

- **Contrast below WCAG:** while documenting accessibility, the AI calculated the token contrasts. The focus ring (2.03:1) and input borders (1.45:1) fell below WCAG's 3:1. Both were fixed in the enquiry UI pass.
- **No error boundary** in the frontend. Listed as a next step.
- **A rate-limit spoofing hole:** if nginx appended `X-Forwarded-For` instead of overwriting it, any client could dodge the per-IP rate limit with a fake header. _Caught by:_ checked during the nginx step, with a spoofed request against the running stack.

## Human review

Every step was reviewed before commit. Decisions that changed behaviour (CORS, linting, message rules, UI layering, "top rated" count) were made by the developer when the AI asked, not by the AI alone.

## Time spent

Commit timestamps run from 01:54 (initial commit) to 03:21 (last code commit) on 2026-11-25: about 1.5 hours of building, after the planning that produced `docs/PLAN.md`.

_To confirm: total time including planning and review: \_\_\_\_._
