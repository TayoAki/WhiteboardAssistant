# Factory-Ready PRD: AI Whiteboard SaaS (MVP)

**Source:** user request (chat, 2026-09-16) + TubeGuruji transcript "Build Full Stack AI Agentic Whiteboard App using NextJs, React, Tailwindcss, Typescript, CodeRabbit" + `PLAN.md` revision 1
**Revision:** 1 (2026-09-16)
**Readiness:** READY WITH ASSUMPTIONS (slices S-1 to S-6 and S-8). S-7 cannot derive a task contract until D-002 and D-003 are resolved.
**Approval:** pending — owner (TayoAki) approves this revision or amends it. No auto-proceed has been authorized.

## 1. Executive summary

Independent users need a whiteboard where an AI collaborator can draw and edit diagrams, wireframes and notes for them instead of only answering in text. Build a Next.js SaaS with an Excalidraw canvas and a CopilotKit agent that reads the board, edits it through validated tools, asks before destructive changes, and is metered by server-enforced credits. The tutorial proves the feature set; this PRD makes it testable and adds the enforcement the tutorial lacks. FluidVoice (macOS dictation) works as an input device from day one; deeper voice integration is a late slice.

## 2. Source facts and evidence

- **Supplied facts (user):** use CopilotKit; build an AI whiteboarding SaaS; inspired by the transcript; FluidVoice integration is "future maybe".
- **Supplied facts (transcript):** Next.js + Tailwind + shadcn; Clerk auth (Google, GitHub, email); Neon Postgres + Drizzle; `users.credits` default 3; boards created via dialog then `/workspace/[projectId]`; Excalidraw canvas with `onChange` autosave, upsert on `project_id`; custom left toolbar via `setActiveTool`; floating properties bar; AI panel with five diagram types generating Excalidraw elements; on-canvas loading placeholder; PNG export; base64 preview thumbnails; soft delete + archive; credits decremented on board creation; CodeRabbit reviews on every PR.
- **External facts (verified 2026-09-16, see `PLAN.md` §2):** CopilotKit 1.72.0 with v2 entry points; Excalidraw 0.18.1 (MIT); tldraw license forbids production use without a commercial agreement; FluidVoice 1.6.0, macOS-only, GPLv3, no public API.
- **Repository evidence:** empty repository; only `PLAN.md` and `README.md` exist; no build, lint, or test commands exist yet; GitHub default branch is currently `claude/festive-fermi-r689ry` (first pushed branch).
- **Unknowns:** hosting target, billing provider and pricing, data-retention policy, whether teams/organizations are ever in scope.

## 3. Goals and success measures

| ID | Goal or measure | Target | How measured |
|---|---|---|---|
| G-001 | A new user can create a board and get an AI-generated diagram on the canvas | ≤ 3 minutes from sign-up, no manual JSON | Playwright e2e timing on staging |
| G-002 | AI diagram requests produce usable output on the first try | ≥ 90 % of the 30-prompt eval set pass (valid, connected, non-overlapping) | eval script in S-6 |
| G-003 | No cross-user data access | 0 failures in the negative-path suite; every project-scoped route covered | integration tests + entry-point inventory test in CI |
| G-004 | AI cost is bounded per user | free tier cannot exceed the configured daily run cap; org spend alert in place | runtime budget tests + provider dashboard |
| G-005 | Work is persisted without user action | reload after edit shows identical scene | e2e assertion on element count and hash |

## 4. Non-goals (this PRD)

- Teams, organizations, shared boards, share links, realtime collaboration.
- The "Smart doc" tab (kept as a stub, no behavior).
- Mobile-native apps; offline mode.
- Vendoring or modifying FluidVoice (GPLv3); any bridge inside FluidVoice is a separate upstream contribution.
- Localization beyond English.

## 5. Users, permissions, and use cases

| Actor | Need | Entry point | Permission or constraint |
|---|---|---|---|
| Visitor | learn what the product does, sign up | `/`, `/sign-up`, `/sign-in` | no data access |
| User (owner) | create, edit, archive own boards; use the AI copilot | `/dashboard*`, `/workspace/[projectId]`, `/api/*` | may only act on boards where `projects.user_id` = their user; credits and rate limits apply |
| Agent (LLM acting for a user) | edit the user's current board via tools | CopilotKit runtime → browser tool handlers | same authority as the user's session, never more; every tool input validated; destructive tools require confirmation |
| Clerk (webhook sender) | notify user deletion | `POST /api/webhooks/clerk` | Svix signature required; may only trigger cleanup, never reads |

Tenant model (A-001): the tenant is the user. Every board query is scoped by `user_id`; the schema keeps room for an `org_id` later.

## 6. User and system flows

### Primary flow

1. User signs in (Clerk) → server upserts `users` row with 3 credits on first authenticated visit.
2. Dashboard → "Create new board" → name → `POST /api/projects` (credit check + decrement atomically) → redirect to `/workspace/[projectId]`.
3. User draws, selects an element, changes properties; scene autosaves 2 s after the last change; preview regenerates.
4. User opens the copilot sidebar (or the AI Helper panel), types or dictates "flowchart for user sign-up with email verification" → agent calls `draw_diagram` → placeholder skeleton appears → diagram replaces it → chat shows a "Drew 9 elements" card.
5. User asks "make the database node blue" → agent calls `update_elements` with ids from the scene summary.
6. User exports PNG; returns to dashboard; preview shows the new diagram.

### Alternate and failure flows

- Not signed in → `/dashboard` and `/workspace/*` redirect to sign-in; `/api/*` returns 401 (webhooks excepted).
- Board belongs to another user → 404 (no existence disclosure), no side effects.
- Credits = 0 → create dialog shows "insufficient credits", `POST /api/projects` returns 402, no row inserted.
- Duplicate create (same client-generated `project_id`) → returns the existing board, no second row (idempotent).
- Scene payload > 5 MB or > 3 000 elements → 413, previous scene kept; UI shows "board too large to save".
- Save fails (network) → UI shows "unsaved changes", retries with backoff, never loses local edits silently.
- AI run when the daily run cap is reached → 429 from the runtime; chat shows the limit and the reset time.
- Agent tool args fail schema validation or exceed caps → tool returns an error string to the agent; canvas unchanged.
- User cancels a `clear_canvas` confirmation → nothing deleted; agent is told the action was declined.
- Model returns a diagram with dangling edges → layout drops the edge and reports it; nothing throws.
- Provider outage → chat shows a retryable error; credits are not debited for failed runs.

## 7. Functional requirements

| ID | Requirement | Priority | Source | Notes |
|---|---|---|---|---|
| FR-001 | The system shall let a visitor sign up / sign in with Google, GitHub, or email + password via Clerk. | Must | transcript | prebuilt Clerk pages |
| FR-002 | The system shall create the user's `users` row server-side on the first authenticated request, with `credits = 3`, exactly once. | Must | transcript (client-side variant) | server-side upsert replaces the tutorial's client `POST` |
| FR-003 | The system shall deny unauthenticated access to `/dashboard*`, `/workspace/*`, and `/api/*` except signature-verified webhooks. | Must | transcript + guardrails | middleware + per-route check |
| FR-004 | The system shall handle Clerk `user.deleted` webhooks by scheduling deletion of the user's boards. | Should | added | retention period is D-005 |
| FR-010 | The system shall create a board with a name of 1–60 characters when the user has ≥ 1 credit, decrementing credits atomically in the same transaction. | Must | transcript | `SELECT … FOR UPDATE` or single `UPDATE … WHERE credits > 0 RETURNING` |
| FR-011 | The system shall list the user's non-archived boards with preview, name, and relative "edited" time, newest first. | Must | transcript | |
| FR-012 | The system shall show an empty state with a create action when the user has no boards. | Must | transcript | |
| FR-013 | The system shall let the owner rename a board. | Should | added | |
| FR-014 | The system shall archive (soft delete) a board and hide it from the main list. | Must | transcript | `is_deleted = true` |
| FR-015 | The system shall list archived boards and let the owner restore or permanently delete them. | Must | transcript | |
| FR-016 | The system shall show credits used vs. plan maximum in the sidebar. | Must | transcript | |
| FR-020 | The workspace shall render an Excalidraw canvas with selection, hand, rectangle, ellipse, diamond, arrow, line, free draw, text, image, and eraser tools in a custom left toolbar. | Must | transcript | `setActiveTool` |
| FR-021 | Selecting exactly one element shall show a floating properties bar (stroke, fill, stroke width/style, opacity, font family/size/align for text, duplicate, delete, lock, bring to front, send to back) positioned near the element. | Must | transcript | |
| FR-022 | The workspace shall autosave elements, a whitelisted subset of app state, and files 2 s after the last change and when the tab is hidden, skipping unchanged scenes. | Must | transcript (10 s) | scene version check |
| FR-023 | Opening a board shall load the persisted scene normalized with Excalidraw `restore` and scroll to content. | Must | transcript | |
| FR-024 | Each save shall regenerate a ≤ 400 px preview and store it with the board. | Must | transcript | base64 until S-7 (A-005) |
| FR-025 | The workspace shall export the scene as PNG. | Must | transcript | |
| FR-026 | The workspace shall offer sticky notes, emoji, and icon inserts. | Should | transcript | |
| FR-027 | The workspace shall support light/dark theme. | Could | video comments | Excalidraw `theme` |
| FR-030 | The workspace shall include a copilot chat (sidebar) bound to the current board. | Must | user (CopilotKit) | `CopilotSidebar` |
| FR-031 | The agent shall receive a scene summary (counts, element ids/types/labels/bounds, selection, viewport) that is refreshed on change and capped at ~4 KB. | Must | added | `useAgentContext` |
| FR-032 | The agent shall draw diagrams (flowchart, architecture, sequence, mindmap, ER) from a compact spec that the client lays out and converts to elements, inserted in empty space and scrolled into view. | Must | transcript (raw JSON variant) | `draw_diagram` |
| FR-033 | The agent shall draw mobile and web wireframes from a screen/component spec using fixed templates. | Must | transcript | `draw_wireframe` |
| FR-034 | The agent shall add notes/text, update element properties, delete elements, zoom to elements, set theme, and export PNG through tools. | Must | added | ids from FR-031 |
| FR-035 | Clearing the canvas, replacing a diagram, or deleting more than 10 elements shall require an in-chat confirmation before execution. | Must | guardrails | `useHumanInTheLoop` |
| FR-036 | Drawing tools shall show a progress card in chat and a skeleton placeholder on the canvas until completion, then remove the placeholder. | Should | transcript | |
| FR-037 | The AI Helper panel (diagram-type chips + prompt) shall send its prompt into the same agent thread as the chat. | Should | transcript | `useAgent` + `runAgent` |
| FR-038 | The chat shall offer contextual suggestion pills. | Could | added | `useConfigureSuggestions` |
| FR-039 | Every tool input shall be validated against a schema with caps (≤ 60 nodes, ≤ 120 edges, ≤ 40 raw elements, label ≤ 60 chars); invalid input shall not touch the canvas. | Must | guardrails | zod |
| FR-040 | AI runs shall be metered per user (daily cap on the free plan) and rate limited, enforced in the runtime, never only in the browser. | Must | transcript (credits) + guardrails | numbers in D-003 |
| FR-050 | The chat input shall accept dictated text (FluidVoice Write Mode) and the prompt shall tolerate dictation artifacts. | Should | user | S-8 |
| FR-051 | The workspace shall offer in-app push-to-talk transcribed server-side. | Could | added | S-8 |
| FR-052 | Drawing tools shall be exposed via WebMCP for compatible browser agents. | Could | added | S-8 |
| FR-060 | Users shall be able to upgrade to a paid plan that raises board and AI limits. | Should | transcript ("add a payment gateway") | provider is D-003 |

## 8. Experience requirements

- **Loading:** skeleton for dashboard grid; canvas shows Excalidraw's loading state; AI runs show a chat card and canvas placeholder.
- **Empty:** dashboard empty state (FR-012); archive empty state; chat starter suggestions.
- **Success:** toast on board create/archive/restore; "Saved" indicator in the header; chat card "Drew N elements".
- **Error and recovery:** unsaved-changes banner with retry; per-field dialog errors; chat errors are retryable; nothing destructive without confirmation; Excalidraw undo remains available after AI edits.
- **Permission denied:** unauthenticated → sign-in redirect; foreign board → "Board not found".
- **Accessibility:** toolbar buttons have labels and keyboard focus; dialogs trap focus (shadcn); confirmation cards are keyboard operable; colour is never the only signal in the credits meter.
- **Responsive/platform behavior:** desktop-first; workspace requires ≥ 1024 px; dashboard works on mobile widths.

## 9. Data, interfaces, and compatibility

- **Data ownership and lifecycle:** all boards belong to one user; archive keeps data; permanent delete removes `projects` + `whiteboard_data` (cascade); account deletion follows D-005.
- **API/events/contracts:** JSON route handlers under `/api/*` with zod-validated bodies; errors `{ error: { code, message } }` with 400/401/402/404/413/429/500; the CopilotKit runtime speaks AG-UI over `/api/copilotkit/*`; audit events per `docs/architecture/GUARDRAIL_MAP.md`.
- **Migration/backfill:** none (greenfield). Drizzle migrations committed from S-2 on.
- **Backward compatibility:** persisted scenes are Excalidraw JSON; always load through `restore()` so older scenes survive library upgrades.

## 10. Quality requirements

| ID | Category | Requirement or threshold | Verification |
|---|---|---|---|
| NFR-001 | security (authorization) | Every project-scoped route resolves the principal from Clerk server-side and scopes the query by `user_id`; foreign ids return 404 with no side effect. | negative integration tests + entry-point inventory test |
| NFR-002 | security (validation) | All untrusted input (bodies, params, tool args, webhook payloads) is parsed with zod at the boundary before any side effect. | unit tests per schema; lint rule forbids `any` in `src/server` |
| NFR-003 | resource/cost limits | Scene ≤ 5 MB and ≤ 3 000 elements; files ≤ 2 MB; AI: `maxSteps` ≤ 8, bounded output tokens, per-user runs/minute and runs/day, org monthly spend alert. | runtime tests with oversized fixtures; budget config test |
| NFR-004 | audit | Structured events for board lifecycle, credit changes, AI runs (start/complete/denied), auth denials; no secrets, prompts, or raw bodies logged. | log-shape test + redaction test |
| NFR-005 | secrets | Provider and DB secrets exist only in server modules; client bundle contains none. | build-time grep in CI |
| NFR-006 | performance | Board load p75 ≤ 2 s for ≤ 500 elements; autosave round trip p75 ≤ 1 s; diagram generation p50 ≤ 15 s for ≤ 20 nodes (measured, then tuned). | e2e timings on staging |
| NFR-007 | reliability | Autosave never loses local edits on transient failure; Neon point-in-time recovery enabled. | e2e with network fault injection |
| NFR-008 | accessibility | Toolbar, dialogs, confirmation cards keyboard-operable; text contrast ≥ 4.5:1 outside the canvas. | axe in Playwright |
| NFR-009 | observability | Error tracking with correlation ids on API and runtime; AI usage logged per run. | manual check on staging |
| NFR-010 | AI quality | ≥ 90 % pass on the 30-prompt eval; no eval prompt produces > 60 nodes. | eval script |
| NFR-011 | privacy | Canvas text and prompts are treated as user data: not used for training, not logged verbatim. | code review + redaction test |

## 11. Dependencies and constraints

- **Dependencies:** Clerk account; Neon project; Anthropic API key (or the provider chosen in D-004); CodeRabbit connected to the repo; GitHub branch protection on `main` (D-001).
- **Fixed constraints:** CopilotKit as the copilot framework (user); Next.js App Router; Excalidraw (license); no FluidVoice code in this repo (GPLv3).
- **Implementation preferences (nonbinding):** Tailwind + shadcn; Drizzle; Playwright + vitest; dagre for layout; Railway if a long-lived runtime process is needed.

## 12. Acceptance criteria and evidence

| ID | Requirement links | Observable acceptance criterion | Planned check | Runtime evidence |
|---|---|---|---|---|
| AC-001 | FR-001, FR-002 | Given a new Google account, when the user signs in and opens `/dashboard`, then exactly one `users` row exists with `credits = 3`, and a second visit creates no new row. | integration test (test DB) | screenshot of dashboard + DB row dump (sanitized) |
| AC-002 | FR-003 | Given no session, when `GET /dashboard`, then redirect to sign-in; when `GET /api/projects`, then 401 with no body data. | Playwright + route test | probe output |
| AC-003 | FR-010 | Given a user with 1 credit, when they create "Board A", then the board exists, credits = 0, and the response contains the board id. | integration test | screenshot + probe |
| AC-004 | FR-010 | Given a user with 0 credits, when they submit the create dialog, then 402 is returned, no `projects` row is inserted, and the dialog shows the insufficient-credits message. | integration + e2e | screenshot + probe |
| AC-005 | FR-010 | Given the same `project_id` is posted twice, then one row exists and the second response returns it. | integration test | probe |
| AC-006 | FR-011, FR-024 | Given two boards with different previews, when the dashboard loads, then both cards show their preview and edited time, newest first. | e2e | screenshot |
| AC-007 | FR-014, FR-015 | Given board B, when archived, then it disappears from the dashboard and appears in the archive; when restored, it returns; when permanently deleted, its `whiteboard_data` row is gone. | e2e + DB assertion | screenshots + probe |
| AC-008 | NFR-001 | Given user X's board id, when user Y calls `GET /api/projects?projectId=`, `PUT /api/whiteboard/:id`, `PATCH`, or `DELETE`, then 404 and no row changes. | negative integration tests (all four routes) | probe outputs |
| AC-009 | NFR-001 | Given the route inventory, when the inventory test runs, then every `app/api/**/route.ts` either calls `requireUser()` or is in the documented allow-list (`webhooks/clerk`). | structural test in CI | CI log |
| AC-010 | FR-020 | Given the workspace, when each toolbar button is clicked, then Excalidraw's active tool changes accordingly and the default toolbar is not visible. | e2e | screenshots |
| AC-011 | FR-021 | Given one selected rectangle, when the stroke colour is changed in the floating bar, then the element's `strokeColor` updates and the bar stays near the element after zoom. | e2e | before/after screenshots |
| AC-012 | FR-022, FR-023 | Given a drawn rectangle, when 2 s pass and the page reloads, then the same element (id, geometry) is present. | e2e | screenshots + element dump |
| AC-013 | FR-022, NFR-003 | Given a scene over 5 MB, when saved, then 413 is returned, the stored scene is unchanged, and the UI shows the too-large message. | integration + e2e | probe + screenshot |
| AC-014 | FR-025 | Given a non-empty board, when Export is clicked, then a PNG downloads whose dimensions match the exported bounds. | e2e (download event) | file + dimensions |
| AC-015 | FR-030, FR-031 | Given a board with a labelled rectangle, when the user asks "what is on my board", then the reply names the label without the user pasting anything. | e2e with recorded model response or live | sanitized trace |
| AC-016 | FR-032, FR-039 | Given "flowchart for password reset", when the agent runs, then ≥ 5 connected elements appear in empty space, arrows are bound to shapes, and the chat shows a completion card. | e2e + eval | screenshot + element dump |
| AC-017 | FR-039 | Given a tool call with 200 nodes, then the tool rejects it, the canvas is unchanged, and the agent receives an error string. | unit test on tool handler | trace |
| AC-018 | FR-035 | Given "clear the board", when the confirmation card is cancelled, then no element is deleted; when confirmed, all elements are deleted and undo restores them. | e2e | screenshots |
| AC-019 | FR-034 | Given a diagram with a node labelled "Database", when the user says "make the database node blue", then only that element's `backgroundColor` changes. | e2e | before/after screenshots |
| AC-020 | FR-040 | Given a free user at the daily run cap, when they send a message, then the runtime returns 429, no model call is made, and the chat shows the reset time. | runtime test with fake clock | probe + screenshot |
| AC-021 | FR-040 | Given an unauthenticated request to any `/api/copilotkit/*` sub-route, then 401. | route test | probe |
| AC-022 | NFR-004 | Given a board creation and an AI run, then audit events with actor, action, target, outcome, correlation id exist and contain no prompt text or secrets. | log-shape test | sanitized log excerpt |
| AC-023 | FR-033 | Given "mobile sign-in screen", then a 390×844 frame with header, two inputs, a button, and a link appears. | e2e + eval | screenshot |
| AC-024 | FR-036 | While a diagram is generating, then a placeholder skeleton is visible; after completion it is gone and no placeholder ids remain. | e2e | frames |
| AC-025 | FR-037 | Given the AI Helper panel, when "Architecture" is chosen and a prompt submitted, then the same thread shows the message and the tool card. | e2e | screenshot |
| AC-026 | NFR-005 | When the production bundle is built, then a grep for provider key names and `DATABASE_URL` in client chunks finds nothing. | CI step | CI log |
| AC-027 | FR-050 | Given text pasted with dictation artifacts ("um draw a, no, a flowchart for login"), then a login flowchart is drawn. | eval prompt | trace |
| AC-028 | FR-051 | Given microphone permission, when push-to-talk records 3 s, then the transcript appears in the input. | manual/e2e with fixture audio | screenshot |
| AC-029 | FR-060 | Given a paid plan, when the user upgrades, then limits change server-side and the meter reflects them. | integration + e2e | screenshots |

## 13. Delivery slices

| Slice | Scope | Requirement links | Depends on | Reviewable outcome |
|---|---|---|---|---|
| S-1 | Bootstrap + governance: Next.js scaffold (in a temp dir, then moved in, because the repo is non-empty), Tailwind/shadcn, TS strict, ESLint incl. layer-import rules, vitest/Playwright skeleton, CI, `.coderabbit.yaml`, real commands in `AGENTS.md`, `main` as protected default | NFR-002, NFR-005, AC-026 | D-001 | green CI on a PR; `AGENTS.md` commands verified |
| S-2 | Auth + DB + user sync: Clerk, schema + constraints, `requireUser()`, scoped repos, webhook | FR-001–FR-004, NFR-001, AC-001, AC-002, AC-009, AC-022 | S-1 | sign-in creates a user; inventory test passes |
| S-3 | Boards + dashboard: create (credits), list, rename, archive/restore/delete, empty state, meter | FR-010–FR-016, AC-003–AC-008 | S-2 | full board lifecycle in e2e |
| S-4 | Canvas: Excalidraw, load/save, previews, toolbar, floating properties, export, inserts, theme | FR-020–FR-027, AC-010–AC-014 | S-3 | draw → reload → identical scene |
| S-5 | Copilot core: runtime route + auth, provider, sidebar, scene context, basic tools, HITL, suggestions, AI Helper wiring | FR-030, FR-031, FR-034, FR-035, FR-037, FR-038, AC-015, AC-018, AC-019, AC-021, AC-025 | S-4 | agent edits the board; unauthenticated runtime call rejected |
| S-6 | Diagram tools: specs, layout, converters, `draw_diagram`, `draw_wireframe`, `add_elements`, placeholder, progress cards, prompt, eval set | FR-032, FR-033, FR-036, FR-039, NFR-010, AC-016, AC-017, AC-023, AC-024 | S-5 | eval ≥ 90 % |
| S-7 | Metering + billing + deploy: runtime credit/rate enforcement, `ai_usage`, previews to object storage, plan upgrade, hosting, observability | FR-040, FR-060, NFR-003, NFR-006–NFR-009, AC-020, AC-029 | S-6, D-002, D-003 | production URL; limits enforced |
| S-8 | Voice: dictation-tolerant prompt, push-to-talk + transcription, WebMCP exposure | FR-050–FR-052, AC-027, AC-028 | S-6 | dictated request draws a diagram |

S-6's pure functions (spec → layout → skeleton) may start in parallel with S-4.

## 14. Rollout, rollback, and observability

- **Rollout:** each slice ships behind the human merge gate; S-7 introduces a staging environment before production; AI tools can be disabled per environment with a flag.
- **Rollback:** revert the merge commit; Drizzle migrations are additive through S-6 (no destructive migration without a documented down path).
- **Analytics/telemetry:** events `board.created`, `ai.run.completed` (tool names, element counts), `export.png`; no prompt text.
- **Operational monitoring:** error tracking, runtime `onError` logging, provider spend dashboard with alert at 80 % of the monthly cap.

## 15. Risks, assumptions, and decisions

### Risks

| Risk | Likelihood/impact | Mitigation | Owner or gate |
|---|---|---|---|
| CopilotKit v2 API churn breaks the runtime or hooks | medium / medium | pin exact versions; isolate CopilotKit code under `src/server/ai` and `src/components/copilot`; read `CHANGELOG.md` before bumps | S-5 |
| In-memory thread runner loses chat history on serverless | high on Vercel / low | decide hosting (D-002); persistent runner or long-lived process | S-7 |
| Model emits invalid or oversized diagram specs | medium / low | zod + caps + one repair round; eval set | S-6 |
| Toolbar hidden via CSS breaks on Excalidraw upgrade | medium / low | pin `0.18.1`; visual regression test | S-4 |
| Base64 previews bloat Postgres rows | medium / medium | move to object storage in S-7 | S-7 |
| Prompt injection via canvas text | medium / medium | canvas text labelled as data in the prompt; no tools that leave the app; HITL for destructive actions | S-5 |
| Credits enforced only client-side by mistake | low / high | runtime hook + negative tests (AC-020) | S-7 |

### Assumptions

- `A-001` — Tenant = user (personal workspaces). Change by adding `org_id` to `projects` and a membership check; every scoped repo already takes a tenant argument.
- `A-002` — Model provider is Anthropic Claude Opus 5 via `BuiltInAgent` (`anthropic/claude-opus-5`). Change by editing one model string and the env var.
- `A-003` — Canvas library is Excalidraw. Reversal means re-doing S-4 and S-6 converters.
- `A-004` — Auth/DB stack is Clerk + Neon + Drizzle as in the transcript.
- `A-005` — Previews are stored as base64 JPEG (≤ 400 px, quality 0.5) until S-7.
- `A-006` — Free plan = 3 boards and a daily AI-run cap of 20 (placeholder until D-003).
- `A-007` — FluidVoice is used only as an OS-level input device until S-8; no bridge is built in this repo.
- `A-008` — Harness-managed branches in Claude Code web sessions count as isolation (single-checkout mode); local work uses worktrees.

### Decisions needed

- `D-001` — Repository governance: create `main` from the current commit, set it as GitHub default, protect it (require PR + CI + CodeRabbit). Owner action; blocks S-1's "protected default" outcome only.
- `D-002` — Hosting: Vercel (serverless; needs a persistent thread runner or stateless threads) vs Railway (long-lived Node process; Railway tooling is available in this session). Needed before S-7.
- `D-003` — Billing provider (Clerk Billing vs Stripe) and pricing/credit model: what a credit buys, free daily AI cap, paid limits. Needed before S-7; A-006 stands until then.
- `D-004` — Confirm model provider (A-002) or choose OpenAI/Google. Reversible; affects cost and eval results.
- `D-005` — Retention after account deletion (proposed: 30 days, then hard delete) and whether users can export all boards.
- `D-006` — Confirm teams/sharing/realtime stay out of scope for this PRD (A-001).

## 16. Definition of done

- All approved `Must` requirements are implemented.
- Every acceptance criterion has pass/fail/untested status with evidence in `.artifacts/<task>/` or the PR.
- Required checks pass on the exact delivered revision.
- Security, privacy, migration, and accessibility gates are satisfied or explicitly waived by the owner.
- Rollout and rollback are documented for the affected risk level.
- Merge and deployment remain human-controlled unless separately authorized.

## Changes from source

- **Clarified:** every transcript feature is now a numbered requirement with an observable criterion; "credits" now covers AI runs, not only board creation; autosave interval 10 s → 2 s + tab-hide.
- **Added:** server-side user sync (replaces client `POST /api/users`), ownership checks on every route, idempotent create, payload caps, rate/spend budgets, audit events, HITL for destructive AI actions, compact diagram spec + layout pipeline, eval set, entry-point inventory test, governance (default branch), evidence plan.
- **Excluded:** Smart doc tab behavior, sharing/collaboration, teams, FluidVoice code changes.
- **Unresolved:** D-001 to D-006.
