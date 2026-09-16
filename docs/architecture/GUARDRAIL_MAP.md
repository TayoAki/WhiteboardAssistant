# Guardrail Map

## Scope

- Repository/subsystem: WhiteboardAssistant (whole product; greenfield)
- Mode: design + PRD hardening (nothing is built yet; every coverage status below is a target, not an observation)
- Requested outcome: a minimal, enforceable guardrail spine for the MVP in `docs/prds/0001-ai-whiteboard-mvp.md`, adopted slice by slice
- Mutation authority: none for this document; S-1/S-2 implement the primitives
- Relevant versions/environment: Next.js App Router (React 19), Clerk, Neon Postgres + Drizzle, CopilotKit 1.72 v2 runtime, Excalidraw 0.18.1

## Non-negotiables applied here

- Guidance (`AGENTS.md`, prompts) is not enforcement; the controls below are.
- Client visibility is not authorization: the browser holds tool handlers and the AI Helper UI, but ownership, credits, and rate limits are decided on the server.
- Authentication is not object access: every board request checks `projects.user_id` against the verified principal.
- Static types are not runtime validation: zod at every boundary, including agent tool arguments and webhook payloads.
- A server module is not automatically secure: the CopilotKit runtime route is a callable entry point with its own auth, budget, and audit.
- The LLM agent is a caller: it acts with the user's authority, never more, and its outputs are untrusted input to the tools.

## Canonical path

```
entry adapter (route handler / webhook / runtime sub-route)
  -> verified request context   requireUser(): VerifiedUser (only src/server/auth can construct it)
  -> runtime schema             zod parse of body/params/args; caps applied
  -> guarded command            src/server/commands/*: authorize action + object, budget check, transaction
  -> scoped data access         src/server/data/repos/*: every query takes the VerifiedUser and filters by user_id
  -> persistence                Postgres constraints (FK cascade, unique, check credits >= 0)
  -> audit event                emitted after the outcome is known, redacted
```

Thin adapters may differ (JSON route vs. AG-UI runtime hook vs. Svix webhook); object-level decisions converge in `src/server/commands`. Server components that read data use the same scoped repos, never `db` directly.

## Trust boundaries and authorities

| Concern | Authority/source of truth | Trusted inputs | Untrusted inputs | Enforcement point | Deny/failure behavior |
|---|---|---|---|---|---|
| Identity | Clerk session (`auth()` in `src/server/auth`) | server-resolved `userId` | cookies, headers, any client-sent user id | `requireUser()` at every adapter | 401 for API, redirect for pages |
| Tenant/membership | `users` row keyed by `clerk_user_id` (tenant = user, A-001) | `VerifiedUser.id` | client `userId`, email in body | `requireUser()` resolves or creates the row | 401 |
| Object access | `projects.user_id` | `VerifiedUser` + `project_id` from path/body | any id the client sends | scoped repos (`boards.forUser(user).byId(id)`) | 404, no side effect, audit `denied` |
| Roles/actions | policy registry (`src/server/policy/registry.ts`: resource/action keys) | command name | — | guarded command | 403 only for future roles; MVP has owner-only |
| Plan/quota | `users.credits`, plan limits in the registry | DB row under `FOR UPDATE` | client-displayed meter | `createBoard` transaction; runtime run hook for AI | 402 (credits) / 429 (rate), nothing created, audit |
| Runtime input | zod schemas in `src/server/schemas` and tool schemas in `src/lib/ai/specs` | parsed values | bodies, params, tool args, webhook JSON | boundary parse before any effect | 400 / tool error string |
| Rate/cost | budget config in the registry + runtime hooks | server clock, per-user counters | — | runtime `onBeforeHandler`/run hook; route middleware | 429 with reset time; fail closed |
| Audit | `src/server/audit` event contract | outcome from the command | — | after command completes/fails | log failure never blocks the user path; alert on audit failures |

## Entry-point inventory (planned)

| Entry point | Caller | Verified context source | Canonical boundary | Data/side effect | Coverage status | Evidence (planned) |
|---|---|---|---|---|---|---|
| `GET /dashboard`, `/dashboard/archive` (server components) | browser | `requireUser()` | `listBoards`, `listArchived` | read `projects` ⋈ `whiteboard_data` | gap → S-3 | e2e AC-006, AC-007 |
| `POST /api/projects` | browser | `requireUser()` | `createBoard` (credit tx, idempotent on `project_id`) | insert `projects`, decrement `credits`, audit | gap → S-3 | AC-003–AC-005 |
| `GET /api/projects[?projectId]` | browser | `requireUser()` | `getBoard` / `listBoards` | read | gap → S-3 | AC-008 |
| `PATCH /api/projects` | browser | `requireUser()` | `renameBoard`, `archiveBoard`, `restoreBoard` | update, audit | gap → S-3 | AC-007, AC-008 |
| `DELETE /api/projects` | browser | `requireUser()` | `deleteBoard` (archived only) | delete cascade, audit | gap → S-3 | AC-007, AC-008 |
| `GET /api/whiteboard/[projectId]` | browser | `requireUser()` | `loadScene` | read | gap → S-4 | AC-012 |
| `PUT /api/whiteboard/[projectId]` | browser (also reached indirectly by agent edits) | `requireUser()` | `saveScene` (size/element caps, app-state whitelist) | upsert `whiteboard_data`, preview | gap → S-4 | AC-012, AC-013 |
| `/api/copilotkit/[[...slug]]` (`/info`, `/agent/:id/run`, threads) | browser via CopilotKit client | Clerk `auth()` inside the handler's request hook | run budget check; agent config is server-owned | model call, `ai_usage`, credits, audit | gap → S-5/S-7 | AC-020, AC-021 |
| Agent tool calls (`draw_*`, `update_elements`, …) | LLM → browser handler | user's session (tools run in the user's page) | zod tool schemas + caps; HITL for destructive | canvas mutation → later `PUT /api/whiteboard` | gap → S-5/S-6 | AC-017, AC-018 |
| `POST /api/webhooks/clerk` | Clerk (Svix) | signature verification (explicit exception to `requireUser`) | `scheduleUserDeletion` | mark user, schedule cleanup | gap → S-2 | webhook replay test |
| `POST /api/transcribe` | browser | `requireUser()` | `transcribe` (size/duration caps) | provider call, `ai_usage` | gap → S-8 | AC-028 |
| Direct `db` usage | any server code | — | forbidden outside `src/server/data` (lint) | — | gap → S-1 lint rule | CI lint |
| Background jobs | none in MVP | — | — | — | n/a | — |

## Static and runtime guardrails

| Invariant | Guidance | Static check | Runtime check | Test/CI evidence | Known bypass |
|---|---|---|---|---|---|
| Principal derived server-side only | `AGENTS.md` | `VerifiedUser` constructor not exported; `server-only` in `src/server/**` | `requireUser()` | inventory test AC-009 | none planned |
| No DB access outside the data layer | `AGENTS.md` | ESLint `no-restricted-imports`: `@/server/data/db` allowed only in `src/server/data/**` | — | lint in CI | dynamic import (review) |
| Vendor SDKs stay in adapters | `AGENTS.md` | `@clerk/nextjs/server` only in `src/server/auth/**`; `@copilotkit/runtime*`, `ai`, `@ai-sdk/*`, `@anthropic-ai/sdk` only in `src/server/ai/**` | — | lint in CI | — |
| Every `/api/**/route.ts` is guarded | `AGENTS.md` | structural test walks `app/api` and asserts `requireUser()` or allow-list | — | AC-009 | allow-list drift (review) |
| Untrusted input parsed with zod | `AGENTS.md` | `@typescript-eslint/no-explicit-any` error in `src/server` | `schema.parse` before effects | schema unit tests | — |
| Board queries scoped by user | `AGENTS.md` | repos take `VerifiedUser` as first arg (type) | `where(user_id = ?)` in every repo method | AC-008 | raw SQL (review); optional Postgres RLS later |
| Credits never negative; create is atomic | — | — | `UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0 RETURNING` in the same tx as insert; `CHECK (credits >= 0)` | AC-003–AC-005 | — |
| Scene size caps | — | — | byte length ≤ 5 MB, elements ≤ 3 000, files ≤ 2 MB each, app-state whitelist | AC-013 | — |
| AI run budgets | prompt says nothing about limits; runtime enforces | budget config typed in registry | per-user runs/min and runs/day counters; `maxSteps` ≤ 8; bounded output tokens; org spend alert | AC-020 | provider-side caps are advisory only |
| Tool args capped | prompt | zod schemas | reject before touching the canvas | AC-017 | none |
| Destructive AI actions confirmed | prompt | HITL tools have no `handler`, only `render` | `respond()` required | AC-018 | agent could use `delete_elements` ≤ 10 repeatedly (accepted; undo available) |
| Secrets server-only | — | grep of client chunks in CI | — | AC-026 | — |
| Audit redaction | — | event type has no free-text field for prompts | redaction helper | AC-022 | — |

## Rate and resource budgets

| Dimension | Control |
|---|---|
| principal | AI runs per minute (20) and per day (free: A-006); board creates per hour (30) |
| tenant | same as principal in MVP (tenant = user) |
| operation | `draw_*` tools count as 1 run each inside a message; `maxSteps` ≤ 8 per run |
| payload | scene ≤ 5 MB, ≤ 3 000 elements, files ≤ 2 MB, prompt ≤ 4 000 chars, scene summary ≤ ~4 KB |
| batch/pagination | dashboard list paginated at 60 |
| execution | route timeout 30 s; runtime run timeout 120 s; model `maxOutputTokens` bounded |
| downstream spend | provider monthly cap + alert at 80 %; fail closed when the counter store is unavailable |

Counters live in Postgres for MVP (single region); revisit with Redis if latency matters. Trusted-proxy handling: rate limits key on the verified user, not IP.

## Audit event contract

`board.created | board.renamed | board.archived | board.restored | board.deleted | credits.debited | ai.run.started | ai.run.completed | ai.run.denied | auth.denied | webhook.user_deleted`

Fields: `event, occurredAt, correlationId, actorId, action, targetType?, targetId?, outcome (success|denied|failed), reasonCode?, metadata (numbers/booleans/enums only)`. Never: prompts, canvas text, tokens, request bodies, emails in metadata.

## Verification matrix (planned)

| Case | Expected result | Layer exercised | Command/test | Result |
|---|---|---|---|---|
| Allowed happy path | board created, scene saved, diagram drawn | all | e2e AC-003, AC-012, AC-016 | untested (not built) |
| Unauthenticated | 401 / redirect; runtime 401 | adapter | AC-002, AC-021 | untested |
| Wrong action/role | n/a in MVP (owner-only) | — | — | n/a |
| Cross-tenant | 404, no change, `auth.denied` audit | command + repo | AC-008 | untested |
| Wrong object | 404 for archived-only delete on active board | command | S-3 test | untested |
| Invalid/oversized input | 400/413, no side effect | schema | AC-013, AC-017 | untested |
| Repeated/concurrent | idempotent create; credits never negative under 10 parallel creates | transaction | AC-005 + concurrency test | untested |
| Alternate entry point | every route in inventory guarded | structural | AC-009 | untested |
| Audit redaction | events present, no secrets/prompts | audit | AC-022 | untested |

## Exceptions and residual risks

| Gap/exception | Impact | Compensating control | Owner | Expiry/review date | Status |
|---|---|---|---|---|---|
| `POST /api/webhooks/clerk` has no user session | medium | Svix signature + idempotent handling | S-2 | permanent, documented | explicit exception |
| Excalidraw toolbar hidden with CSS, not an API | low (UX only) | version pin + visual test | S-4 | each Excalidraw upgrade | explicit exception |
| Previews stored as base64 in Postgres | medium (size) | size cap; move to object storage | S-7 | S-7 | unverified |
| `InMemoryAgentRunner` thread state | medium (UX) | decide hosting/runner (D-002) | S-7 | S-7 | open gap |
| Client-side tools could be invoked by a tampered page | low (user's own data only) | server still authorizes persistence; no server-side effects from tools | S-5 | — | accepted |

## Next bounded action

- Smallest enforcement improvement: in S-1 add the ESLint import rules and the `app/api` inventory test skeleton (failing until S-2 adds `requireUser()`), so every later route is born guarded.
- Proof required: CI fails on a route without `requireUser()`; lint fails on `db` import from a component.
- Explicitly out of scope: roles/teams, Postgres RLS (optional later), provider-side spend enforcement.
