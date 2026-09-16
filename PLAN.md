# WhiteboardAssistant — Build Plan

**Status:** planning (no code yet) · **Branch convention:** one branch + PR per phase, CodeRabbit review on every PR · **Facts verified:** 2026-09-16

---

## 0. TL;DR

- **What:** an AI whiteboarding SaaS with the feature set demonstrated in the TubeGuruji "Build Full Stack AI Agentic Whiteboard App" video (dashboard, multiple boards, Excalidraw canvas with custom toolbar and floating properties, autosave, board previews, soft delete/archive, credits, AI diagram/wireframe generation, PNG export).
- **What changes vs. the video:** the hand-rolled AI sidebar and the single "Gemini returns a JSON blob" route are replaced by **CopilotKit v2**. The copilot is a real agent that *sees* the canvas (`useAgentContext`), *edits* it through typed, validated tools (`useFrontendTool`), *asks before destructive actions* (`useHumanInTheLoop`), and *shows progress in chat* (tool rendering). The video's "AI Helper" quick-action panel is kept as a launcher that sends prompts into the same agent.
- **Model:** Claude Opus 5 via CopilotKit's `BuiltInAgent` (`model: "anthropic/claude-opus-5"`). Provider is a one-string swap (OpenAI/Google/Anthropic all supported by `BuiltInAgent`).
- **Canvas:** Excalidraw (`@excalidraw/excalidraw` 0.18.1, MIT). tldraw was evaluated and rejected for now: its license forbids production use without a paid commercial agreement.
- **FluidVoice:** a macOS-only, Swift, on-device dictation app (GPLv3) with **no public API, URL scheme, HTTP server, MCP, or AppleScript surface**. It works with this product on day one as OS-level dictation into the chat box. Deeper integration is planned as a later phase (in-app push-to-talk, WebMCP tool exposure, and an optional upstream bridge), see §9.

---

## 1. Transcript → decisions

| Video chapter | What the video does | What we do |
|---|---|---|
| 2. Project setup | `fast-nextjs` boilerplate (Next.js, Tailwind, shadcn, Neon+Drizzle, Clerk) | Same stack, but bootstrapped explicitly (`create-next-app` + `shadcn init`) so every dependency is pinned and understood. |
| 3. CodeRabbit | Connect repo, PR-per-chapter, review before merge | Same. Add `.coderabbit.yaml` with path instructions (API routes, DB schema, agent tools). |
| 4. DB + auth | Clerk; `users` table with `credits` default 3; client-side `POST /api/users` on every page load | Clerk; users upserted **server-side** (dashboard layout on first visit, plus Clerk webhook for deletions). No client-side "create me" call. |
| 5–6. Dashboard | Sidebar (create, all files, archive, shared, AI helper, settings), welcome banner, empty state, credits meter | Same UI. "Shared files" and "Smart doc" tab stay stubs → backlog. |
| 7. Create workspace | Dialog → `POST /api/projects` → `/workspace/[projectId]`; credits checked and decremented server-side | Same, with a `projects.user_id` FK instead of storing the user's email, and Zod validation of the body. |
| 8. Whiteboard layout | Excalidraw with `onChange` debounced 10 s → upsert `whiteboard_data` (`onConflictDoUpdate`) | Same idea, 2 s debounce + save on tab hide + skip no-op saves via scene version. Load with `restore()` to normalize persisted data. |
| 9. Custom toolbar | Hide Excalidraw toolbar with CSS, custom left rail calling `setActiveTool` | Same. Use `UIOptions`, a custom `MainMenu`, `renderTopRightUI` and `WelcomeScreen` for everything that has an official prop; CSS only for the toolbar (no official prop exists). |
| 10. Floating properties | Compute position from selected element + zoom/scroll; mutate via `updateScene` with `version+1` | Same. Shared `patchElements()` helper reused by the AI tools. |
| 11. AI features | Floating "AI Helper" panel, 5 tool types with system prompts, on-canvas skeleton placeholder, `POST /api/ai` → Gemini with `responseSchema`, then `updateScene` | CopilotKit agent + frontend tools. Diagram output is a compact **spec** (nodes/edges) that we lay out client-side (dagre) → `convertToExcalidrawElements`. Placeholder skeleton kept as UX. Quick-action panel kept, but it dispatches a message to the agent. |
| 12. Export as image | `exportToBlob` → download `whiteboard.png` | Same, plus an `export_png` agent tool. |
| 13. AI extras | Notes, emoji, icons pickers | Same (client-only inserts via `convertToExcalidrawElements`). |
| 14. Fetch data / 15. Project list | `GET /api/projects?projectId=` with ownership check; left join for `preview_image`; base64 preview stored in Postgres | Same shape. Previews start as base64 (MVP), move to object storage in Phase 7. |
| 16. Credits | Deduct on board creation; block at 0 | Same, plus **per-AI-generation** debit enforced on the server (runtime hooks), see §6.9. |

Backlog from viewer questions in the video comments: dark theme + background colour (Excalidraw `theme` prop, cheap), share links / realtime collaboration (Excalidraw supports `isCollaborating` + your own websocket; not MVP), deployment (Phase 7).

---

## 2. Verified stack (npm registry / GitHub, 2026-09-16)

| Piece | Version | Notes |
|---|---|---|
| `@copilotkit/react-core` | **1.72.0** (2026-09-15) | Import from **`@copilotkit/react-core/v2`**. Package root re-exports the deprecated v1 API only. Peer deps: React 18/19, `zod >= 3.25`. Chat UI (`CopilotChat`, `CopilotSidebar`, `CopilotPopup`) lives in this package in v2; `@copilotkit/react-ui` is not needed. Styles: `@copilotkit/react-core/v2/styles.css`. |
| `@copilotkit/runtime` | **1.72.0** | Import from **`@copilotkit/runtime/v2`** (`CopilotRuntime`, `BuiltInAgent`, `createCopilotRuntimeHandler`, `InMemoryAgentRunner`, `defineTool`). Runtime is a pure Fetch handler; Next.js App Router exports it as `GET/POST/PATCH/DELETE` on a catch-all route. 1.72.0 "repaired multiple v1 runtime surfaces broken since v1.50.0" → pin exact versions and read `CHANGELOG.md` on every bump. |
| v1 → v2 hook map | v1 deprecated since 1.68.2 | `useCopilotAction`→`useFrontendTool` / `useHumanInTheLoop` / `useRenderTool`; `useCopilotReadable`→`useAgentContext`; `useCoAgent`/`useCopilotChat`→`useAgent`; `useCopilotChatSuggestions`→`useConfigureSuggestions`; `CopilotKit`→`CopilotKitProvider`. Do **not** copy v1 snippets from older tutorials/blogs. |
| `@ag-ui/core` | 0.0.59 | Transport protocol under CopilotKit (SSE events). Nothing to code against directly. |
| `@excalidraw/excalidraw` | **0.18.1** (2026-04-20), MIT | Peer React 17/18/19. Next.js: `dynamic(() => import(...).then(m => m.Excalidraw), { ssr: false })`, `"use client"`, `import "@excalidraw/excalidraw/index.css"`, wrapper with explicit height. |
| `tldraw` | 5.4.2 | **Rejected:** license text forbids "use of the Software in Production Environments" without a commercial agreement, watermark enforced. Revisit only if we want its richer editor and are willing to pay. |
| Next.js / React | latest stable at bootstrap (App Router, React 19) | CopilotKit's own examples run Next.js 16 + React 19 + Tailwind 4. |
| Auth / DB | Clerk · Neon Postgres · Drizzle | As in the video. |
| Model | Claude Opus 5 (`claude-opus-5`) | Default per Anthropic guidance; $5 / $25 per MTok (in/out). |
| FluidVoice | 1.6.0, macOS 15+, Swift, GPLv3 (since 2026-02-23; earlier releases Apache 2.0) | `brew install --cask fluidvoice`. Details in §9. |

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
│ Route handlers (Clerk auth)  │   │ CopilotRuntime (v2)               │
│  projects, whiteboard,       │   │  BuiltInAgent("anthropic/claude-  │
│  users/webhook, transcribe   │   │   opus-5", prompt, maxSteps)      │
└──────────────┬───────────────┘   │  onRequest: Clerk auth + credits  │
               ▼                   └───────────────┬───────────────────┘
┌──────────────────────────────┐                   ▼
│ Neon Postgres via Drizzle    │        Anthropic API (via AI SDK)
│ users · projects ·           │
│ whiteboard_data · ai_usage   │
└──────────────────────────────┘
```

Two independent loops:

1. **Persistence loop:** Excalidraw `onChange` → debounce → `PUT /api/whiteboard/:projectId` with `{elements, appState (subset), files, previewImage}`. Never goes through the LLM.
2. **Agent loop:** user message (typed, dictated, or from a quick-action chip) → runtime → Claude → tool call → **executes in the browser** against the live `excalidrawAPI` → result string back to Claude → persistence loop picks the change up like any manual edit.

Because tools run client-side, the agent needs no DB access for drawing; the server only enforces auth, credits, and usage logging.

---

## 4. Data model (Drizzle, Postgres)

```ts
users            id serial PK · clerk_user_id text unique · email text · name text
                 credits int default 3 · plan text default 'free' · created_at
projects         id serial PK · project_id uuid unique (public id) · user_id → users.id
                 name text · is_deleted bool default false · created_at · updated_at
whiteboard_data  id serial PK · project_id → projects.project_id unique
                 elements jsonb · app_state jsonb · files jsonb
                 preview_image text (base64 MVP → URL later) · scene_version int · updated_at
ai_usage         id serial PK · user_id · project_id · tool text (draw_diagram|draw_wireframe|…)
                 prompt_chars int · tokens_in int · tokens_out int · created_at
```

- `project_id` unique + `onConflictDoUpdate` on `whiteboard_data.project_id` (the video hit exactly this: upsert needs a unique constraint).
- `app_state` is stored as a **whitelist** (viewBackgroundColor, gridSize, zoom, scroll, theme). Never persist the full `AppState` (it contains transient UI state and collaborator data).
- Chat threads: CopilotKit's `InMemoryAgentRunner` keeps them in process memory. Fine for dev; see §11 for production.

---

## 5. Routes and pages

| Path | Kind | Purpose |
|---|---|---|
| `/` | page | Landing (sign-in / sign-up CTA). |
| `/sign-in`, `/sign-up` | Clerk pages | |
| `/dashboard` | protected | Banner, project grid with previews, empty state, create dialog. |
| `/dashboard/archive` | protected | Soft-deleted boards: restore / delete permanently. |
| `/dashboard/settings` | protected | Credits, plan, (later) billing. |
| `/workspace/[projectId]` | protected | Header (name, whiteboard/doc tabs, export, share stub), canvas, copilot sidebar. |
| `POST /api/projects` | route | Create board (credit check + decrement in one transaction). |
| `GET /api/projects` / `?projectId=` | route | List (non-deleted, left-joined preview) / single with ownership check. |
| `PATCH /api/projects` | route | Rename, archive, restore. |
| `DELETE /api/projects` | route | Hard delete (from archive only). |
| `GET/PUT /api/whiteboard/[projectId]` | route | Load / upsert scene. |
| `/api/copilotkit/[[...slug]]` | route | CopilotKit runtime (§6.1). |
| `POST /api/webhooks/clerk` | route | `user.deleted` → cleanup. |
| `POST /api/transcribe` | route (Phase 8) | Audio blob → text. |

`proxy.ts`/`middleware.ts` uses `clerkMiddleware` + `createRouteMatcher(["/dashboard(.*)", "/workspace(.*)", "/api/(.*)"])` and `auth.protect()` (exempt `/api/webhooks/*`). Every route additionally checks **ownership** of the project (the video added this only after CodeRabbit flagged it).

---

## 6. CopilotKit integration design

### 6.1 Runtime route

```ts
// app/api/copilotkit/[[...slug]]/route.ts
import { auth } from "@clerk/nextjs/server";
import {
  BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler, InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { WHITEBOARD_PROMPT } from "@/lib/ai/prompt";

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
  // reject unauthenticated calls and check credits here (exact hook signature: verify in 1.72 docs)
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
```

The route **must** be a catch-all and export all four verbs because the runtime serves sub-routes (`/info`, `/agent/:id/run`, threads).

### 6.2 Provider and UI (workspace only)

```tsx
// app/workspace/[projectId]/layout.tsx  ("use client" island)
import "@copilotkit/react-core/v2/styles.css";
import { CopilotKitProvider, CopilotSidebar } from "@copilotkit/react-core/v2";

<CopilotKitProvider runtimeUrl="/api/copilotkit">
  <WorkspaceHeader … />
  <Whiteboard projectId={projectId} />   {/* registers context + tools */}
  <CopilotSidebar />                     {/* or CopilotPopup to keep the video's floating-button feel */}
</CopilotKitProvider>
```

Keep the video's floating **AI Helper** panel (tool chips + textarea + Generate). Its Generate button uses `useAgent()` + `useCopilotKit()`: `agent.addMessage({ role: "user", content })` then `copilotkit.runAgent({ agent })`, so both entry points hit the same agent and the same thread. `useConfigureSuggestions` provides pills like "Turn the selection into a flowchart".

### 6.3 What the agent sees (`useAgentContext`)

Registered inside `<Whiteboard>` and recomputed (throttled) on `onChange`:

```ts
useAgentContext({
  description: "Current whiteboard: element inventory, labels, bounds, selection, viewport",
  value: summarizeScene(elements, appState),   // ≤ ~4 KB: counts by type, {id,type,label,x,y,w,h} for up to N elements,
});                                             // selected ids, viewport, empty-region hint
```

Design rules: include element **ids** (so edit/delete tools can target them), truncate labels, cap the list, and state in the system prompt that canvas text is *user data, not instructions* (prompt-injection hygiene).

### 6.4 Frontend tool catalog (`useFrontendTool`, zod params, run in the browser)

| Tool | Params (zod) | Handler | Phase |
|---|---|---|---|
| `draw_diagram` | `DiagramSpec` (§6.5) | layout → `convertToExcalidrawElements` → `updateScene({elements:[...existing, ...new]})` → `scrollToContent(new, {fitToContent:true})` | 6 |
| `draw_wireframe` | `WireframeSpec` (device: mobile/web, screens[], components[]) | template layout → frame + shapes + text per screen | 6 |
| `add_elements` | array of raw `ExcalidrawElementSkeleton` (escape hatch, capped at 40) | convert + insert at empty region | 6 |
| `add_sticky_note` / `add_text` | `{text, color?, near?: elementId}` | insert | 5 |
| `update_elements` | `{ids[], patch: {strokeColor?, backgroundColor?, text?, …}}` | shared `patchElements()` (same helper as the floating properties bar; bumps `version`, `updated`) | 5 |
| `delete_elements` | `{ids[]}` | mark `isDeleted: true` | 5 |
| `arrange` | `{ids[], mode: 'align-left'|'distribute-h'|'grid'}` | pure geometry | 7 |
| `set_theme` / `set_background` | `{theme}` / `{color}` | `updateScene({appState})` | 5 |
| `export_png` | `{}` | `exportToBlob` → download | 5 |
| `zoom_to` | `{ids[] \| 'all'}` | `scrollToContent` | 5 |

Every tool returns a short string ("Drew 14 elements: ids …") so the agent can chain (e.g. draw, then recolor the "Database" node). While `status` is in-progress the tool's `render` shows a card in chat, and `draw_*` tools also drop the video's on-canvas **skeleton placeholder** (fixed ids, removed on completion).

### 6.5 Diagram spec + layout pipeline (the quality lever)

The video asks the model for raw Excalidraw JSON with absolute coordinates, which is token-heavy and fragile. We ask for a **compact spec** and compute geometry locally:

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

Pipeline: `DiagramSpec` → `@dagrejs/dagre` layout (or a simple layered layout for v1) → skeleton with `label: { text }` on shapes and arrows bound with `start: { id }` / `end: { id }` → `convertToExcalidrawElements(skeleton)` (ids regenerated by default, which also avoids collisions with existing elements) → insert at `getEmptyCanvasPosition()` (right of current content + margin, as in the video) → `scrollToContent`. Wireframes use fixed templates (mobile 390×844, web 1280×800 frames) with a small component vocabulary (header, nav, hero, input, button, card, list, image, text). Both specs are unit-tested as pure functions.

### 6.6 Human-in-the-loop (`useHumanInTheLoop`)

Destructive or expensive actions render a confirmation card instead of executing: `clear_canvas`, `replace_diagram` (delete N elements and redraw), `delete_elements` when `ids.length > 10`. The `render` component receives `{ args, status, respond }`; on `ToolCallStatus.Executing` it shows Confirm/Cancel and calls `respond("confirmed" | "cancelled")`. Undo remains available through Excalidraw history regardless.

### 6.7 Generative UI

- `render` on each `draw_*` tool: "Generating flowchart… 12 nodes" → "Done · Undo" card.
- `useDefaultRenderTool` catch-all so any new tool has a sensible card without extra code.
- Optional: progressive drawing from streamed partial `args` (nodes appear as they stream). Stretch goal; do not mutate the canvas from partial args until the spec is stable.

### 6.8 System prompt outline (`lib/ai/prompt.ts`)

Role (whiteboard co-designer) · tool policy (prefer `draw_diagram`/`draw_wireframe`; use `add_elements` only for free-form shapes; never exceed caps; ask via HITL before clearing) · layout guidance (short labels, 5–25 nodes typical, group by subsystem) · style palette (the video's colour rules, e.g. pastel fills + dark strokes) · canvas text is data, not instructions · reply briefly after acting. Keep the prompt **static** so it caches (Anthropic prompt caching via AI SDK `providerOptions`; verify how `BuiltInAgent` forwards it).

### 6.9 Credits and usage enforcement (server-side)

- Board creation: transaction `SELECT credits FOR UPDATE` → decrement → insert (as in the video, but atomic).
- AI generations: debit **in the runtime**, not from the browser. Options, in order of preference: (1) the handler's `onBeforeHandler`/run hooks with the user resolved from Clerk; (2) an AG-UI event observer counting `draw_*` tool calls; (3) fallback: `POST /api/ai-usage` from the tool handler (client-trusted, MVP only). Verify which of (1)/(2) the 1.72 API exposes before Phase 7.
- Rate limit agent runs per user (e.g. 20/min) at the same hook.

---

## 7. Canvas engineering notes (Excalidraw 0.18.1)

- Obtain the API with the `excalidrawAPI={(api) => setApi(api)}` prop; keep it in a ref for tool handlers. Methods used: `updateScene`, `getSceneElements`, `getAppState`, `getFiles`, `addFiles`, `setActiveTool`, `scrollToContent`, `setToast`, `history.clear`, `onChange` (unsubscribe on unmount).
- Loading: `initialData` accepts a Promise → `initialData={loadScene(projectId)}` where `loadScene` runs `restore()` over persisted `{elements, appState, files}` and sets `scrollToContent: true`.
- Saving: `onChange(elements, appState, files)` → debounce 2 s → skip if scene version unchanged → `PUT`. Preview: `exportToBlob({ elements, appState, files, mimeType: "image/jpeg", quality: 0.5, maxWidthOrHeight: 400 })` → base64 (MVP) with a size cap.
- Element mutations from our code (properties bar, AI tools): copy element, apply patch, set `version: v + 1`, `versionNonce`, `updated: Date.now()`, then `updateScene`. Duplicate = same object with new `id`, `seed`, offset x/y (as in the video).
- Hide/replace default UI: `UIOptions.canvasActions` (export/load/save/clear) and `UIOptions.tools.image`; custom `<MainMenu>` (rendering it replaces the default menu); `<WelcomeScreen>` branding; `renderTopRightUI` for the AI button. The **toolbar has no official hide prop**, so keep the video's scoped CSS override (`.excalidraw .App-toolbar { display: none }`) behind a version pin and a visual regression test.
- Sticky notes: skeleton docs on `master` document a `stickynote` type; verify it exists in 0.18.1, otherwise emit rectangle + label with a yellow background.
- Fonts/assets load from Excalidraw's CDN by default; set the asset path env if self-hosting (verify variable name in 0.18.1 docs).

---

## 8. Delivery phases

Each phase = one branch, one PR, CodeRabbit review, merge to `main`. Estimates assume one developer.

| # | Branch | Scope | Acceptance |
|---|---|---|---|
| 1 | `01-bootstrap` | `create-next-app` (TS strict, App Router, Tailwind), `shadcn init` + components, ESLint/Prettier, `.env.example`, `.coderabbit.yaml`, CI (typecheck + lint + vitest), README | `npm run build` green in CI; CodeRabbit comments on the PR. |
| 2 | `02-auth-db` | Clerk (Google/GitHub/email), Neon + Drizzle schema (§4), `db:push`, server-side user upsert, Clerk webhook, route protection | Sign in → row in `users`; `/dashboard` 401s when signed out. |
| 3 | `03-dashboard` | Sidebar/header layout, banner, project grid, empty state, create dialog (uuid, credit check), credits meter, archive page, soft delete/restore | Create → redirect to `/workspace/:id`; delete → appears in archive; restore works; credits update. |
| 4 | `04-workspace-canvas` | Workspace header (tabs, export), Excalidraw dynamic import, load/save/upsert, previews, custom toolbar, floating properties (colour, stroke, fill, opacity, font, align, duplicate, delete, lock, z-order), export PNG, notes/emoji/icons | Draw → reload → identical scene; preview on dashboard; all properties bar actions work. |
| 5 | `05-copilotkit-agent` | Runtime route + auth hook, provider, sidebar, `useAgentContext` scene summary, basic tools (`add_sticky_note`, `add_text`, `update_elements`, `delete_elements`, `set_theme`, `zoom_to`, `export_png`), HITL `clear_canvas`, suggestions, AI Helper panel wired to `useAgent` | "Add a yellow note that says X near the login box" works; "clear the board" asks first; unauthenticated call to `/api/copilotkit` is rejected. |
| 6 | `06-diagram-tools` | `DiagramSpec`/`WireframeSpec`, dagre layout, skeleton conversion, `draw_diagram`, `draw_wireframe`, `add_elements`, placeholder skeleton, progress cards, prompt tuning, 30-prompt eval set (flowchart/architecture/web/mobile) | ≥ 90 % of eval prompts produce a valid, non-overlapping, connected diagram on first try; p50 latency measured. |
| 7 | `07-credits-billing-deploy` | Server-side AI usage debit, rate limits, `ai_usage` log, previews → object storage, Clerk Billing (or Stripe) for plans, deployment (Vercel, or Railway if we need a long-lived runtime process), error tracking, Playwright e2e | Free user blocked at 0 credits; paid user upgraded; production URL live; e2e green. |
| 8 | `08-voice` | §9 tiers 1–2: dictation-friendly prompt, in-app push-to-talk (`CopilotChatAudioRecorder` + `/api/transcribe`), WebMCP exposure of `draw_*` tools | Dictated "draw a signup flow" via FluidVoice works end-to-end; in-app mic works on non-macOS. |

Parallelizable: Phase 6's pure layout/spec work can start during Phase 4.

---

## 9. FluidVoice integration path

**What it is (from the repo, 2026-09-16):** macOS 15+ menu-bar app in Swift; on-device speech models (Nemotron Speech 3.5, Parakeet Flash/TDT, Cohere Transcribe, Apple Speech, Whisper); **Write Mode** ("write or rewrite text directly in any text field across any app" via Accessibility APIs, "Smart Typing"), **Command Mode** ("launch apps, run shortcuts, trigger system actions, and automate workflows"), **Per-App Configuration** ("assign different prompt sets to different apps"), local "Fluid Intelligence" enhancement, optional OpenAI/Groq cloud keys in Keychain, global hotkey. iOS and Windows "on the way". Repo layout: `Sources/`, `Tests/`, `docs/` (one internal UI-automation test plan), `Package.swift`. **No** URL scheme, CLI, HTTP server, MCP, AppleScript, or plugin API is documented.

**License:** GPLv3 from 2026-02-23 (older versions Apache 2.0). Consequence: never vendor FluidVoice code into the SaaS; integrate across a process boundary (text insertion, HTTP, URL scheme). Any bridge we build inside FluidVoice is an upstream GPLv3 contribution (or a fork), not part of this repo.

| Tier | What | Effort | Depends on |
|---|---|---|---|
| 1 · Zero-code (day one) | User dictates into the CopilotChat textarea with Write Mode; Enter sends. We make the input a stable, focus-friendly textarea, and the system prompt tolerates dictation artifacts (fillers, self-corrections). Users can add a per-app prompt set for their browser ("turn this into a concise diagram request"). | Prompt + UX polish | Phase 5 |
| 2 · In-app voice (platform-neutral) | Push-to-talk button using CopilotKit's `CopilotChatAudioRecorder` (MediaRecorder → Blob; not wired into the input by default) → `POST /api/transcribe` (CopilotKit runtime ships a `transcription-service` module; verify its providers in 1.72, else Whisper/Deepgram) → inject as a user message. Web Speech API as a no-server fallback. | ~2–3 days | Phase 8 |
| 3 · Agent-addressable board | Expose `draw_*`/`update_*` tools via `useFrontendTool({ …, webmcp: { annotations } })`. CopilotKit mirrors them onto `document.modelContext` (WebMCP), which "compatible browser agents" (Chrome 149+ origin trial) discover and call. A future FluidVoice Command Mode → browser-agent handoff would then drive the board by voice without any custom bridge. | ~1 day + testing | Phase 8, Chrome trial |
| 4 · Native bridge (optional, upstream) | Add to FluidVoice a Command Mode action that POSTs the transcript to `http://localhost:<port>/voice` or opens `whiteboard://ai?prompt=…`; a tiny companion or browser deep link forwards it into the copilot thread. Also candidate: FluidVoice as an MCP client/server. | Swift work, PR to altic-dev/FluidVoice | Their roadmap; GPLv3 |

Recommendation: ship tiers 1–2, prototype tier 3, and open a discussion issue upstream for tier 4 once the product exists.

---

## 10. Security, cost, ops

- **AuthZ everywhere:** Clerk middleware + per-route ownership checks (`projects.user_id === current user`), including `/api/copilotkit`. API keys are server-only.
- **Input limits:** scene payload ≤ 5 MB, ≤ 3 000 elements, files ≤ 2 MB each; tool arg caps (§6.5); reject unknown element types from `add_elements`.
- **Prompt injection:** canvas text and dictated text are data; tools that leave the app (none in MVP) would need HITL.
- **Cost control:** static system prompt (cacheable), compact scene summary, `maxSteps` cap, per-user rate limit, `ai_usage` logging with tokens; review weekly. Opus 5 list price $5/$25 per MTok; a typical diagram turn should be a few thousand tokens.
- **Observability:** error tracking (Sentry or similar), runtime `onError` hook logging, CodeRabbit security scan on each PR (as in the video).
- **Testing:** vitest for spec→skeleton and layout; Playwright for create/draw/reload/export; eval set for AI generation quality (Phase 6).

---

## 11. Risks and open decisions

1. **CopilotKit v2 churn.** v1 was deprecated at 1.68.2 and 1.72.0 still repairs 1.50 regressions. Mitigation: pin exact versions, keep all CopilotKit code in `lib/copilot/` and `components/copilot/`, read the changelog on upgrade.
2. **Thread persistence.** `InMemoryAgentRunner` loses threads on restart and across serverless instances. Decide in Phase 7: persistent runner (check 1.72's `runner/` options) or a long-lived Node host (Railway) for the runtime route.
3. **Excalidraw UI overrides.** Toolbar hiding is CSS-only; pin `0.18.1` and add a visual test.
4. **Model output validity.** Zod validation + one automatic repair round-trip; caps prevent canvas floods.
5. **Preview storage.** Base64 JPEGs in Postgres bloat rows; move to object storage in Phase 7.
6. **FluidVoice is macOS-only** and has no API; in-app voice (tier 2) is the cross-platform path.

Decisions taken by default (change by editing this file): Anthropic Claude Opus 5 as the model; Excalidraw over tldraw; Clerk + Neon + Drizzle; previews as base64 for MVP; "Smart doc" tab, sharing and realtime collaboration deferred.

---

## 12. Environment variables

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
ANTHROPIC_API_KEY=            # BuiltInAgent reads this for anthropic/* models
# Phase 8 (in-app voice): transcription provider key
# Phase 7: object storage + billing keys
```

---

## Appendix: references used

- CopilotKit monorepo (`github.com/CopilotKit/CopilotKit`): `packages/react-core/src/v2/hooks/*`, `packages/react-core/src/v1-deprecated-compatibility.ts` (v1→v2 map), `packages/runtime/src/agent/index.ts` (`BuiltInAgent`, `defineTool`), docs source under `showcase/shell-docs/src/content/docs/` (`frontend-tools.mdx`, `shared-state.mdx`, `human-in-the-loop/`, `generative-ui/tool-rendering.mdx`, `runtime-server-adapter.mdx`, `webmcp.mdx`, `frontends/react-spa.mdx`), snippets `copilot-runtime.mdx`, `copilot-ui.mdx`, `use-agent.mdx`; public docs at docs.copilotkit.ai (v2 migration guide: `/migrate/v2`).
- Excalidraw docs source (`github.com/excalidraw/excalidraw`, `dev-docs/docs/@excalidraw/excalidraw/`): `integration.mdx`, `api/props/*.mdx`, `api/excalidraw-element-skeleton.mdx`, `api/utils/export.mdx`, `api/utils/restore.mdx`, `api/children-components/*`.
- FluidVoice: `github.com/altic-dev/FluidVoice` README, `docs/`, LICENSE.
- tldraw `LICENSE.md`; Excalidraw `LICENSE` (MIT).
- Video: "Build Full Stack AI Agentic Whiteboard App using NextJs, React, Tailwindcss, Typescript, CodeRabbit" (TubeGuruji, transcript provided).
