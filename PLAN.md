# WhiteboardAssistant — Build Plan

**Revision:** 3 (2026-09-16) · **Status:** PRD approved, no code yet · **Companion documents:** `docs/prds/0001-ai-whiteboard-mvp.md` (requirements, acceptance criteria, slices, decisions), `docs/architecture/GUARDRAIL_MAP.md` (enforcement design), `AGENTS.md` (operating contract)

Revision 3 records the owner's approval of the PRD and the decisions: hosting on Railway, no billing, personal-tool phase first. Revision 2 applied two checked-in skills (`.claude/skills/software-factory`, `.claude/skills/architectural-guardrails`): the feature list became a factory-ready PRD with stable IDs and evidence, the security prose became an enforceable guardrail spine, and delivery now follows a PRD → isolated branch → evidence → PR → bounded review → human merge pipeline.

---

## 0. TL;DR

- **What:** an AI whiteboarding SaaS with the feature set from the TubeGuruji "Build Full Stack AI Agentic Whiteboard App" video (dashboard, boards, Excalidraw canvas with custom toolbar and floating properties, autosave, previews, archive, credits, AI diagram/wireframe generation, PNG export).
- **What changes vs. the video:** the hand-rolled AI sidebar and the single "Gemini returns a JSON blob" route are replaced by **CopilotKit v2**. The copilot *sees* the canvas (`useAgentContext`), *edits* it through validated tools (`useFrontendTool`), *asks before destructive actions* (`useHumanInTheLoop`), and *shows progress in chat*. The video's "AI Helper" panel stays as a launcher into the same agent thread.
- **What the skills added:** requirement/acceptance IDs (FR/NFR/AC) with an evidence plan; a canonical guarded path (`requireUser()` → zod → command → scoped repo → constraints → audit) with lint rules and an entry-point inventory test; rate/cost budgets; audit events; a PR gate with CodeRabbit bounded to five cycles and a human merge; governance (the default branch must become a protected `main`).
- **Model:** Claude Opus 5 via CopilotKit's `BuiltInAgent` (`anthropic/claude-opus-5`); one-string swap to OpenAI/Google (D-004).
- **Canvas:** Excalidraw 0.18.1 (MIT). tldraw rejected: its license forbids production use without a commercial agreement.
- **FluidVoice:** macOS-only Swift dictation app (GPLv3) with no public API; works day one as OS-level dictation into the chat box; deeper integration in S-8 (§9).
- **Readiness:** PRD revision 2 is **approved** (`READY WITH ASSUMPTIONS`, all slices). Owner decisions: hosting = Railway (D-002); no billing/Stripe while the product is a personal tool (D-003); only allowlisted accounts are admitted (A-009). Remaining owner action before any slice PR: D-001 (create and protect `main`).

---

## 1. Transcript → decisions

| Video chapter | What the video does | What we do |
|---|---|---|
| 2. Project setup | `fast-nextjs` boilerplate | Explicit `create-next-app` + `shadcn init` so every dependency is pinned. Scaffold in a temporary directory and move files in: `create-next-app` refuses a non-empty directory containing files outside its allow-list, and this repo already holds planning docs. |
| 3. CodeRabbit | PR per chapter, review before merge | Same, formalized: review gate = CodeRabbit on the current head with no unresolved actionable comments, ≤ 5 cycles, human merge (`AGENTS.md`). |
| 4. DB + auth | Clerk; `users.credits` default 3; client-side `POST /api/users` on every load | Clerk; user row upserted **server-side** in `requireUser()`; Clerk webhook for deletions (FR-002, FR-004). |
| 5–6. Dashboard | Sidebar, banner, empty state, credits meter | Same UI (FR-011, FR-012, FR-016). "Shared files" and "Smart doc" stay stubs (non-goals). |
| 7. Create workspace | Dialog → `POST /api/projects` → `/workspace/[projectId]`; credits decremented | Same, atomic and idempotent on the client-generated `project_id` (FR-010, AC-003–AC-005); `user_id` FK instead of email. |
| 8. Whiteboard layout | `onChange` debounced 10 s → upsert | 2 s debounce + tab-hide save, scene-version skip, `restore()` on load, payload caps (FR-022, FR-023, AC-013). |
| 9. Custom toolbar | Hide toolbar via CSS; `setActiveTool` | Same; official props (`UIOptions`, `MainMenu`, `renderTopRightUI`, `WelcomeScreen`) wherever one exists; CSS only for the toolbar (explicit exception in the guardrail map). |
| 10. Floating properties | Position from selection + zoom/scroll; `updateScene` with `version+1` | Same; shared `patchElements()` used by the properties bar and the AI tools (two callers → one capability, per the factory's architecture gate). |
| 11. AI features | AI panel, five prompt types, raw Excalidraw JSON from Gemini, on-canvas placeholder | CopilotKit agent + tools; compact spec laid out client-side (§6.5); placeholder kept; panel dispatches into the agent (FR-030–FR-039). |
| 12. Export | `exportToBlob` → PNG | Same + `export_png` tool (FR-025). |
| 13. AI extras | Notes, emoji, icons | Same (FR-026). |
| 14–15. Fetch / list | Ownership check, left join for previews, base64 previews | Same shape; previews base64 until S-7 (A-005). |
| 16. Credits | Deduct on board creation; block at 0 | Same, plus server-enforced AI run budgets (FR-040, NFR-003, AC-020). |

Backlog from viewer questions: dark theme (FR-027, Could), share links/collaboration (non-goal), deployment (S-7).

---

## 2. Verified stack (npm registry / GitHub, 2026-09-16)

| Piece | Version | Notes |
|---|---|---|
| `@copilotkit/react-core` | **1.72.0** (2026-09-15) | Import from **`@copilotkit/react-core/v2`**; the package root re-exports the deprecated v1 API only. Peers: React 18/19, `zod >= 3.25`. Chat UI (`CopilotChat`, `CopilotSidebar`, `CopilotPopup`) lives here in v2; `@copilotkit/react-ui` not needed. Styles: `@copilotkit/react-core/v2/styles.css`. |
| `@copilotkit/runtime` | **1.72.0** | Import from **`@copilotkit/runtime/v2`** (`CopilotRuntime`, `BuiltInAgent`, `createCopilotRuntimeHandler`, `InMemoryAgentRunner`, `defineTool`). Pure Fetch handler; Next.js exports `GET/POST/PATCH/DELETE` on a catch-all route. 1.72.0 "repaired multiple v1 runtime surfaces broken since v1.50.0" → pin exact versions, read `CHANGELOG.md` on every bump. |
| v1 → v2 hook map | v1 deprecated since 1.68.2 | `useCopilotAction`→`useFrontendTool`/`useHumanInTheLoop`/`useRenderTool`; `useCopilotReadable`→`useAgentContext`; `useCoAgent`/`useCopilotChat`→`useAgent`; `useCopilotChatSuggestions`→`useConfigureSuggestions`; `CopilotKit`→`CopilotKitProvider`. Never copy v1 snippets from older tutorials. |
| `@ag-ui/core` | 0.0.59 | Transport under CopilotKit; nothing to code against directly. |
| `@excalidraw/excalidraw` | **0.18.1** (2026-04-20), MIT | Peer React 17/18/19. Next.js: `dynamic(() => import(...).then(m => m.Excalidraw), { ssr: false })`, `"use client"`, `import "@excalidraw/excalidraw/index.css"`, wrapper with explicit height. |
| `tldraw` | 5.4.2 | **Rejected:** license forbids "use of the Software in Production Environments" without a commercial agreement; watermark enforced. |
| Next.js / React | latest stable at bootstrap (App Router, React 19) | CopilotKit's examples run Next.js 16 + React 19 + Tailwind 4. |
| Auth / DB | Clerk · Neon Postgres · Drizzle | As in the video (A-004). |
| Model | Claude Opus 5 (`claude-opus-5`) | $5 / $25 per MTok (in/out). |
| FluidVoice | 1.6.0, macOS 15+, Swift, GPLv3 (since 2026-02-23; earlier Apache 2.0) | `brew install --cask fluidvoice`; §9. |
| Session tooling (factory preflight) | git, node 22, npm, python3, jq present; `gh` and ffmpeg absent | GitHub via MCP tools; evidence via headless Playwright screenshots + assertion logs. |
| Hosting | Railway (D-002) | one long-lived Node service; CopilotKit runtime in-process; `InMemoryAgentRunner` accepted for the personal-tool phase (A-010); Railway tooling is attached to this session for S-7. |

---

## 3. Architecture

```
Browser (Next.js App Router, "use client" islands)
┌──────────────────────────────────────────────────────────────────────┐
│  /workspace/[projectId]                                              │
│  ┌──────────────────────────┐   ┌───────────────────────────────┐   │
│  │ <Whiteboard>             │   │ <CopilotSidebar>              │   │
│  │  Excalidraw (0.18.1)     │   │  chat, tool cards, HITL cards │   │
│  │  custom toolbar          │◄──┤  suggestion pills             │   │
│  │  floating properties     │   └───────────────┬───────────────┘   │
│  │  useAgentContext(scene)  │                   │ AG-UI events (SSE) │
│  │  useFrontendTool(draw_…) │                   │                    │
│  │  useHumanInTheLoop(…)    │                   │                    │
│  └──────────┬───────────────┘                   │                    │
└─────────────┼───────────────────────────────────┼────────────────────┘
              │ PUT /api/whiteboard/:id (debounced)│ /api/copilotkit/*
              ▼                                    ▼
┌──────────────────────────────┐   ┌───────────────────────────────────┐
│ Route handlers               │   │ CopilotRuntime (v2)               │
│  requireUser() → zod →       │   │  BuiltInAgent("anthropic/claude-  │
│  command → scoped repo       │   │   opus-5", prompt, maxSteps)      │
│  projects, whiteboard,       │   │  request hook: Clerk auth,        │
│  webhooks/clerk, transcribe  │   │  run budget, audit                │
└──────────────┬───────────────┘   └───────────────┬───────────────────┘
               ▼                                   ▼
┌──────────────────────────────┐        Anthropic API (via AI SDK)
│ Neon Postgres via Drizzle    │
│ users · projects ·           │
│ whiteboard_data · ai_usage   │
│ + FK/unique/check constraints│
└──────────────────────────────┘
```

Two independent loops:

1. **Persistence loop:** Excalidraw `onChange` → debounce → `PUT /api/whiteboard/:projectId` with `{elements, appState (whitelist), files, previewImage}`. Never goes through the LLM.
2. **Agent loop:** user message (typed, dictated, or from a quick-action chip) → runtime (auth + budget) → Claude → tool call → **executes in the browser** against the live `excalidrawAPI` → result string back to Claude → the persistence loop saves the change like any manual edit.

### 3.1 Canonical guarded path (from the guardrail map)

```
entry adapter -> requireUser() -> zod parse -> guarded command -> scoped repo -> Postgres constraints -> audit event
```

- `src/server/auth/` is the only module importing `@clerk/nextjs/server` and the only constructor of `VerifiedUser`.
- `src/server/commands/` owns authorization, quotas, and transactions; `src/server/data/` is the only module importing the Drizzle client and filters every query by `user_id`.
- `src/server/ai/` is the only module importing `@copilotkit/runtime*`, `ai`, `@ai-sdk/*`, `@anthropic-ai/sdk`.
- ESLint `no-restricted-imports` enforces those layer rules; a structural test asserts every `app/api/**/route.ts` calls `requireUser()` or sits on the documented allow-list (webhooks). Both land in S-1 so later routes are born guarded.
- The agent is a caller with the user's authority; tool inputs are validated and capped client-side, and the only server-side effects of an agent run are the run itself, its budget debit, and audit events.

---

## 4. Data model (Drizzle, Postgres)

```ts
users            id serial PK · clerk_user_id text unique · email text · name text
                 credits int default 3 CHECK (credits >= 0) · plan text default 'free' · created_at · deleted_at
projects         id serial PK · project_id uuid unique (public id) · user_id → users.id ON DELETE CASCADE
                 name text (1–60) · is_deleted bool default false · created_at · updated_at
whiteboard_data  id serial PK · project_id → projects.project_id unique ON DELETE CASCADE
                 elements jsonb · app_state jsonb (whitelist) · files jsonb
                 preview_image text (base64 MVP → URL in S-7) · scene_version int · updated_at
ai_usage         id serial PK · user_id → users.id · project_id · tool text · run_id text
                 tokens_in int · tokens_out int · outcome text · created_at
audit_events     id bigserial PK · event text · occurred_at · correlation_id · actor_id · action · target_type · target_id
                 outcome text · reason_code text · metadata jsonb (numbers/booleans/enums only)
```

- `onConflictDoUpdate` on `whiteboard_data.project_id` (the unique constraint the video had to add after the upsert failed).
- Credits: `UPDATE users SET credits = credits - 1 WHERE id = $1 AND credits > 0 RETURNING credits` inside the create transaction; the `CHECK` is defense in depth (verify Drizzle `check()` support in the pinned version, else a raw migration).
- `app_state` is a whitelist (viewBackgroundColor, gridSize, zoom, scroll, theme); never persist the full `AppState`.
- Chat threads: CopilotKit's `InMemoryAgentRunner` keeps them in the Railway process; they reset on redeploy, accepted in the personal-tool phase (A-010).

---

## 5. Routes and entry points

| Path | Kind | Purpose | Guard |
|---|---|---|---|
| `/` · `/sign-in` · `/sign-up` | pages | landing, Clerk | public |
| `/dashboard` · `/dashboard/archive` · `/dashboard/settings` | server components | boards, archive, credits/plan | `requireUser()` + scoped repos |
| `/workspace/[projectId]` | page | header, canvas, copilot | `requireUser()` + ownership (404) |
| `POST/GET/PATCH/DELETE /api/projects` | routes | create (credits, idempotent), list/get, rename/archive/restore, hard delete (archived only) | `requireUser()`, zod, commands |
| `GET/PUT /api/whiteboard/[projectId]` | routes | load / upsert scene (caps, whitelist, preview) | `requireUser()`, ownership |
| `/api/copilotkit/[[...slug]]` | runtime | AG-UI sub-routes (`/info`, `/agent/:id/run`, threads) | Clerk auth in the handler hook, run budgets, audit |
| `POST /api/webhooks/clerk` | webhook | `user.deleted` → scheduled cleanup | Svix signature (explicit exception) |
| `POST /api/transcribe` (S-8) | route | audio → text | `requireUser()`, size/duration caps |
| `GET /api/health` | route | Railway health check | public; returns status only (explicit exception) |

The full inventory with coverage status lives in `docs/architecture/GUARDRAIL_MAP.md`.

---

## 6. CopilotKit integration design

### 6.1 Runtime route

```ts
// src/app/api/copilotkit/[[...slug]]/route.ts
import {
  BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler, InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { WHITEBOARD_PROMPT } from "@/server/ai/prompt";

const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: "anthropic/claude-opus-5",   // resolved by the AI SDK; reads ANTHROPIC_API_KEY
      prompt: WHITEBOARD_PROMPT,
      maxSteps: 8,                         // default is 1 → agent could not chain tool calls
    }),
  },
  runner: new InMemoryAgentRunner(),
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
  // adapters expose onRequest / onBeforeHandler / onResponse / onError hooks:
  // requireUser(), per-user run budget, correlation id, audit — exact hook signature: verify in 1.72 docs
});

export const GET = handler; export const POST = handler;
export const PATCH = handler; export const DELETE = handler;
```

The route must be a catch-all and export all four verbs; every sub-route is an entry point (AC-021).

### 6.2 Provider and UI (workspace only)

```tsx
import "@copilotkit/react-core/v2/styles.css";
import { CopilotKitProvider, CopilotSidebar } from "@copilotkit/react-core/v2";

<CopilotKitProvider runtimeUrl="/api/copilotkit">
  <WorkspaceHeader … />
  <Whiteboard projectId={projectId} />   {/* registers context + tools */}
  <CopilotSidebar />                     {/* or CopilotPopup for the video's floating-button feel */}
</CopilotKitProvider>
```

The AI Helper panel (chips + textarea + Generate) uses `useAgent()` + `useCopilotKit()`: `agent.addMessage({ role: "user", content })` then `copilotkit.runAgent({ agent })` (FR-037). `useConfigureSuggestions` provides pills (FR-038).

### 6.3 What the agent sees (`useAgentContext`, FR-031)

```ts
useAgentContext({
  description: "Current whiteboard: element inventory, labels, bounds, selection, viewport",
  value: summarizeScene(elements, appState),   // ≤ ~4 KB: counts by type, {id,type,label,x,y,w,h} capped,
});                                             // selected ids, viewport, empty-region hint
```

Include element ids (edit/delete tools target them), truncate labels, cap the list, and say in the prompt that canvas text is data, not instructions.

### 6.4 Frontend tool catalog (`useFrontendTool`, zod params, run in the browser)

| Tool | Params (zod) | Handler | Slice |
|---|---|---|---|
| `draw_diagram` | `DiagramSpec` (§6.5) | layout → `convertToExcalidrawElements` → `updateScene({elements:[...existing, ...new]})` → `scrollToContent(new, {fitToContent:true})` | S-6 |
| `draw_wireframe` | `WireframeSpec` (device, screens[], components[]) | template layout → frame + shapes + text per screen | S-6 |
| `add_elements` | raw `ExcalidrawElementSkeleton[]` (≤ 40) | convert + insert at empty region | S-6 |
| `add_sticky_note` / `add_text` | `{text, color?, near?: elementId}` | insert | S-5 |
| `update_elements` | `{ids[], patch}` | shared `patchElements()` (bumps `version`, `updated`) | S-5 |
| `delete_elements` | `{ids[]}` (> 10 → HITL) | mark `isDeleted: true` | S-5 |
| `arrange` | `{ids[], mode}` | pure geometry | S-7+ |
| `set_theme` / `set_background` | `{theme}` / `{color}` | `updateScene({appState})` | S-5 |
| `export_png` | `{}` | `exportToBlob` → download | S-5 |
| `zoom_to` | `{ids[] \| 'all'}` | `scrollToContent` | S-5 |

Every tool returns a short string ("Drew 14 elements: ids …") so the agent can chain. While `status` is in progress, the tool's `render` shows a chat card and `draw_*` tools drop the video's on-canvas skeleton placeholder (fixed ids, removed on completion, AC-024). Invalid or over-cap args never touch the canvas (FR-039, AC-017).

### 6.5 Diagram spec + layout pipeline (the quality lever)

The video asks the model for raw Excalidraw JSON with absolute coordinates, which is token-heavy and fragile. We ask for a compact spec and compute geometry locally:

```ts
export const DiagramSpec = z.object({
  title: z.string().max(80),
  kind: z.enum(["flowchart", "architecture", "sequence", "mindmap", "er"]),
  direction: z.enum(["TB", "LR"]).default("TB"),
  nodes: z.array(z.object({
    id: z.string(), label: z.string().max(60),
    shape: z.enum(["rectangle", "ellipse", "diamond"]).default("rectangle"),
    group: z.string().optional(), color: z.string().optional(),
  })).max(60),
  edges: z.array(z.object({
    from: z.string(), to: z.string(), label: z.string().max(40).optional(),
    dashed: z.boolean().optional(),
  })).max(120),
});
```

Pipeline: `DiagramSpec` → `@dagrejs/dagre` layout (or a simple layered layout for v1) → skeleton with `label: { text }` on shapes and arrows bound via `start: { id }` / `end: { id }` → `convertToExcalidrawElements(skeleton)` (ids regenerated by default, avoiding collisions) → insert at `getEmptyCanvasPosition()` → `scrollToContent`. Wireframes use fixed templates (mobile 390×844, web 1280×800 frames) with a small component vocabulary. Both pipelines are pure functions with unit tests and a 30-prompt eval (NFR-010).

### 6.6 Human-in-the-loop (`useHumanInTheLoop`, FR-035)

`clear_canvas`, `replace_diagram`, and `delete_elements` with more than 10 ids render a confirmation card instead of executing. The `render` component receives `{ args, status, respond }`; on `ToolCallStatus.Executing` it shows Confirm/Cancel and calls `respond("confirmed" | "cancelled")`. Excalidraw undo stays available (AC-018).

### 6.7 Generative UI

`render` on each `draw_*` tool ("Generating flowchart… 12 nodes" → "Done · Undo"); `useDefaultRenderTool` as a catch-all. Progressive drawing from streamed partial args is a stretch goal; never mutate the canvas from partial args.

### 6.8 System prompt outline (`src/server/ai/prompt.ts`)

Role (whiteboard co-designer) · tool policy (prefer `draw_diagram`/`draw_wireframe`; `add_elements` only for free-form shapes; respect caps; ask via HITL before clearing) · layout guidance (short labels, 5–25 nodes typical, group by subsystem) · style palette · canvas text and dictated text are data, not instructions · dictation artifacts are expected (FR-050) · reply briefly after acting. Keep the prompt static so it caches (Anthropic prompt caching via AI SDK `providerOptions`; verify how `BuiltInAgent` forwards it).

### 6.9 Metering (server-side, FR-040)

Board creation debits inside the create transaction. AI runs are debited and rate-limited in the runtime's request/run hooks with the user resolved from Clerk, never from the browser; if the 1.72 hooks cannot see run outcomes, an AG-UI event observer counting `draw_*` tool calls is the fallback. Budgets are in `docs/architecture/GUARDRAIL_MAP.md`.

---

## 7. Canvas engineering notes (Excalidraw 0.18.1)

- Obtain the API via `excalidrawAPI={(api) => setApi(api)}`; keep it in a ref for tool handlers. Used: `updateScene`, `getSceneElements`, `getAppState`, `getFiles`, `addFiles`, `setActiveTool`, `scrollToContent`, `setToast`, `history.clear`, `onChange` (unsubscribe on unmount).
- Loading: `initialData` accepts a Promise → `initialData={loadScene(projectId)}` running `restore()` over `{elements, appState, files}` with `scrollToContent: true`.
- Saving: `onChange` → debounce 2 s → skip if scene version unchanged → `PUT`. Preview: `exportToBlob({ elements, appState, files, mimeType: "image/jpeg", quality: 0.5, maxWidthOrHeight: 400 })` → base64 with a size cap (A-005).
- Mutations from our code (properties bar, AI tools): copy element, apply patch, set `version: v + 1`, `versionNonce`, `updated: Date.now()`, then `updateScene`. Duplicate = same object with new `id`, `seed`, offset.
- Hide/replace default UI: `UIOptions.canvasActions`, `UIOptions.tools.image`; custom `<MainMenu>` (rendering it replaces the default menu); `<WelcomeScreen>`; `renderTopRightUI`. The toolbar has no hide prop → scoped CSS (`.excalidraw .App-toolbar { display: none }`) behind a version pin and a visual test.
- Sticky notes: skeleton docs on `master` document a `stickynote` type; verify in 0.18.1, else rectangle + label with a yellow background.
- Fonts/assets load from Excalidraw's CDN by default; set the asset path env if self-hosting (verify variable name).

---

## 8. Guardrail spine (summary; full map in `docs/architecture/GUARDRAIL_MAP.md`)

| Layer | What we use it for |
|---|---|
| Instructions (`AGENTS.md`/`CLAUDE.md`) | discovery of the canonical path; never enforcement |
| Types | `VerifiedUser` opaque type; repos take it as the first argument; typed policy registry (resources, actions, plan limits, audit event names) |
| Lint / dependency rules | `db` only in `src/server/data`; Clerk server SDK only in `src/server/auth`; AI SDKs only in `src/server/ai`; no `any` in `src/server`; `server-only` markers |
| Runtime schemas | zod for bodies, params, webhook payloads, tool args (with caps) |
| Policy boundary | `src/server/commands/*`: object-level authorization, credit/rate budgets, transactions |
| DB constraints | FK cascades, unique `project_id` / `clerk_user_id`, `CHECK (credits >= 0)`; Postgres RLS optional later |
| Tests | negative-path integration tests per route (AC-008), entry-point inventory test (AC-009), concurrency test on credits, schema unit tests, e2e |
| CI gates | lint, typecheck, unit, e2e, client-bundle secret grep (AC-026); CodeRabbit review |
| Audit / monitoring | structured events (`board.*`, `credits.debited`, `ai.run.*`, `auth.denied`) with redaction; error tracking; provider spend alert |

Budgets (per user): AI runs 20/min and a daily cap (A-006), board creates 30/h, scene ≤ 5 MB / ≤ 3 000 elements, files ≤ 2 MB, prompt ≤ 4 000 chars, `maxSteps` ≤ 8, bounded output tokens, org monthly spend alert at 80 %; fail closed when the counter store is unavailable.

---

## 9. Delivery workflow (software factory)

1. **PRD gate.** Work starts from `docs/prds/0001-ai-whiteboard-mvp.md` once the owner approves the revision. Material changes need a new approval note. `BLOCKED` scope (S-7 until D-002/D-003) is not implemented.
2. **Task contract per slice:** source revision, outcome, FR/AC IDs, out of scope, risk level, required checks, required evidence, authorized external actions, stop conditions.
3. **Preflight:** read `AGENTS.md` and the guardrail map, inspect working state, check open PRs for overlapping files, confirm repository evidence still matches the PRD.
4. **Isolation:** branch `feat/s<slice>-<slug>` from `main`; local work in `.worktrees/<branch>`; Claude Code web sessions use their assigned branch (single-checkout mode authorized there). Never on the default branch.
5. **Build** through the canonical path; extract shared mechanics only when two callers exist (`patchElements`, `debitCredits`, scene summary), never speculatively.
6. **Prove:** lint → typecheck → focused tests → e2e → build; evidence in `.artifacts/<task>/` (`before.*`, `after.*`, `assertions.md`, `report.md`) using the headless fallback (Playwright screenshots + assertion log; no recorder or ffmpeg assumed). Every AC gets pass / fail / untested with a reason.
7. **PR** via `.github/pull_request_template.md` with the AC table.
8. **Review loop:** CodeRabbit on the current head; classify each finding (defect, judgment call, informational, false positive with evidence); ≤ 5 cycles; stop on conflicts, timeouts, or scope expansion.
9. **Human merge gate:** the owner merges; agents never merge or deploy.

Governance prerequisite (D-001): GitHub currently treats `claude/festive-fermi-r689ry` as the default branch because it was the first push into an empty repository. Create `main` from the current commit, set it as default, and protect it (require PR, CI, CodeRabbit) before S-1 opens its PR.

---

## 10. Delivery slices

Each slice = one branch, one PR, CodeRabbit review, human merge. Full requirement links and evidence per acceptance criterion are in the PRD §12–13.

| Slice | Branch | Scope | Exit criteria |
|---|---|---|---|
| S-1 | `claude/festive-fermi-r689ry` (harness branch) | Scaffold (temp dir → move in), Tailwind (shadcn deferred to S-3: `ui.shadcn.com` is blocked in the build sandbox), TS strict, ESLint layer rules, vitest + Playwright skeleton, CI, `.coderabbit.yaml`, `.env.example`, real commands in `AGENTS.md`, `GET /api/health`, entry-point inventory test | CI green on a PR; `AGENTS.md` commands verified by running them |
| S-2 | `feat/s2-auth-db` | Clerk, owner allowlist in `requireUser()` (FR-005), schema + constraints + migrations, scoped repos, audit helper, Clerk webhook, route protection | AC-001, AC-002, AC-009, AC-022, AC-031 |
| S-3 | `feat/s3-boards` | Create (atomic credits, idempotent), list, rename, archive/restore/delete, empty state, meter | AC-003–AC-008 |
| S-4 | `feat/s4-canvas` | Excalidraw, load/save with caps, previews, toolbar, floating properties, export, inserts, theme | AC-010–AC-014 |
| S-5 | `feat/s5-copilot-core` | Runtime route + auth hook, provider, sidebar, scene context, basic tools, HITL, suggestions, AI Helper wiring | AC-015, AC-018, AC-019, AC-021, AC-025 |
| S-6 | `feat/s6-diagram-tools` | Specs, layout, converters, `draw_diagram`, `draw_wireframe`, `add_elements`, placeholder, cards, prompt, 30-prompt eval | AC-016, AC-017, AC-023, AC-024; eval ≥ 90 % |
| S-7 | `feat/s7-metering-deploy` | Runtime credit/rate enforcement, `ai_usage`, Railway service + Neon, deploy on merge to `main`, `GET /api/health`, observability, bundle secret grep (object storage for previews only if needed) | AC-020, AC-026, AC-030; Railway URL |
| S-8 | `feat/s8-voice` | Dictation-tolerant prompt, push-to-talk + `/api/transcribe`, WebMCP exposure | AC-027, AC-028 |

S-6's pure functions may start during S-4. S-7 is unblocked (D-002/D-003 resolved); creating the Railway service and setting variables are external actions that need explicit authorization when S-7 runs.

---

## 11. FluidVoice integration path

**What it is (repo, 2026-09-16):** macOS 15+ menu-bar app in Swift; on-device speech models (Nemotron Speech 3.5, Parakeet Flash/TDT, Cohere Transcribe, Apple Speech, Whisper); **Write Mode** (text insertion into any app via Accessibility APIs), **Command Mode** (launch apps, run shortcuts, system actions), **Per-App Configuration** (prompt sets per app), local "Fluid Intelligence", optional OpenAI/Groq keys in Keychain, global hotkey. iOS and Windows "on the way". **No** URL scheme, CLI, HTTP server, MCP, AppleScript, or plugin API is documented.

**License:** GPLv3 from 2026-02-23. Never vendor FluidVoice code into the SaaS; integrate across a process boundary. Any bridge inside FluidVoice is an upstream GPLv3 contribution, not part of this repo (non-goal in the PRD).

| Tier | What | Effort | Depends on |
|---|---|---|---|
| 1 · Zero-code (day one) | Dictate into the CopilotChat textarea with Write Mode; stable focus-friendly input; prompt tolerates dictation artifacts (FR-050, AC-027); optional per-app prompt set in FluidVoice for the browser. | prompt + UX polish | S-5 |
| 2 · In-app voice (platform-neutral) | Push-to-talk with CopilotKit's `CopilotChatAudioRecorder` (MediaRecorder → Blob; not wired into the input by default) → `POST /api/transcribe` (runtime ships a `transcription-service` module; verify providers in 1.72, else Whisper/Deepgram) → inject as a user message; Web Speech API as a no-server fallback (FR-051). | ~2–3 days | S-8 |
| 3 · Agent-addressable board | Expose `draw_*`/`update_*` via `useFrontendTool({ …, webmcp: { annotations } })`; CopilotKit mirrors them onto `document.modelContext` for compatible browser agents (Chrome 149+ origin trial) (FR-052). | ~1 day + testing | S-8, Chrome trial |
| 4 · Native bridge (optional, upstream) | FluidVoice Command Mode action posting the transcript to `http://localhost:<port>/voice` or a `whiteboard://` URL scheme; or FluidVoice as an MCP client. | Swift work, PR to altic-dev/FluidVoice | their roadmap; GPLv3 |

---

## 12. Risks and open decisions

Risks with mitigations and owners are in the PRD §15. Decisions the owner must make:

| ID | Decision | Needed by |
|---|---|---|
| D-001 | Create `main` from the current commit, make it GitHub's default, protect it | before S-1's PR |
| D-002 | **Resolved:** Railway (long-lived Node process) | — |
| D-003 | **Resolved:** no billing, no Stripe; personal tool first. Credits stay as a configurable cost control (A-006) | — |
| D-004 | Confirm Anthropic Claude Opus 5 (A-002) or choose OpenAI/Google | before S-5 (one-string swap later) |
| D-005 | Retention after account deletion (proposed 30 days) and full export | before S-2's webhook |
| D-006 | **Resolved by direction:** teams/sharing/realtime out of scope (personal tool) | — |

Defaults taken by assumption (`A-001`–`A-010` in the PRD): tenant = user; Anthropic model; Excalidraw; Clerk + Neon + Drizzle; base64 previews; budgets 3 boards + 20 AI runs/day, configurable; FluidVoice as input device only; harness branch = isolation in web sessions; **owner email allowlist while personal (A-009)**; **chat threads reset on redeploy (A-010)**.

Two technical items remain marked "verify": the exact request-hook signature of `createCopilotRuntimeHandler` in 1.72, and whether Excalidraw 0.18.1 ships the `stickynote` skeleton type.

---

## 13. Environment variables

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
ANTHROPIC_API_KEY=            # BuiltInAgent reads this for anthropic/* models
ALLOWED_EMAILS=               # comma-separated; personal-tool admission (FR-005)
BOARD_CREDITS=3               # A-006
AI_RUNS_PER_DAY=20            # A-006
# S-8: transcription provider key
# S-7: all of the above live in Railway variables; object storage key only if previews move off base64
```

---

## Appendix: references used

- CopilotKit monorepo (`github.com/CopilotKit/CopilotKit`): `packages/react-core/src/v2/hooks/*`, `packages/react-core/src/v1-deprecated-compatibility.ts` (v1→v2 map), `packages/runtime/src/agent/index.ts` (`BuiltInAgent`, `defineTool`), docs source under `showcase/shell-docs/src/content/docs/` (`frontend-tools.mdx`, `shared-state.mdx`, `human-in-the-loop/`, `generative-ui/tool-rendering.mdx`, `runtime-server-adapter.mdx`, `webmcp.mdx`, `frontends/react-spa.mdx`), snippets `copilot-runtime.mdx`, `copilot-ui.mdx`, `use-agent.mdx`; public docs at docs.copilotkit.ai (v2 migration guide: `/migrate/v2`).
- Excalidraw docs source (`github.com/excalidraw/excalidraw`, `dev-docs/docs/@excalidraw/excalidraw/`): `integration.mdx`, `api/props/*.mdx`, `api/excalidraw-element-skeleton.mdx`, `api/utils/export.mdx`, `api/utils/restore.mdx`, `api/children-components/*`.
- FluidVoice: `github.com/altic-dev/FluidVoice` README, `docs/`, LICENSE. tldraw `LICENSE.md`; Excalidraw `LICENSE` (MIT).
- Skills applied: `.claude/skills/software-factory` (PRD intake, execution, evidence, review loop, setup) and `.claude/skills/architectural-guardrails` (guardrail patterns, research basis, AI context and enforcement), including their read-only `factory_doctor.py` and `guardrail_doctor.py` preflights run on this repository.
- Video: "Build Full Stack AI Agentic Whiteboard App using NextJs, React, Tailwindcss, Typescript, CodeRabbit" (TubeGuruji, transcript provided).
