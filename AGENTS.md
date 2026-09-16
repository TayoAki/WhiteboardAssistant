# Repository agent workflow

Operating contract for any agent (Claude Code, Codex, Cursor) or human working in this repository. Keep this file short and true; put procedures in `.claude/skills/` and details in `docs/`.

## Current state (2026-09-16)

- Greenfield: no application code yet. Only planning documents exist.
- No install, lint, typecheck, test, or build command exists yet. **Do not claim any command was run until S-1 replaces the "planned" list below with verified commands.**
- PRD revision 2 is approved by the owner (2026-09-16): hosting on Railway, no billing, personal-tool phase with an owner allowlist. D-005 (retention) is still open but low impact.
- The GitHub default branch is currently the first pushed branch; D-001 in the PRD asks the owner to create and protect `main`. **No slice may open a PR until `main` exists.**

## Task contract

- Treat a raw PRD, brief, issue, transcript, or idea as input to refine, not permission to implement. The approved PRD is `docs/prds/0001-ai-whiteboard-mvp.md` (revision 2, approved 2026-09-16).
- Work only from a PRD marked `READY` or `READY WITH ASSUMPTIONS`; never from `BLOCKED` scope (none at revision 2).
- Every slice, test, commit, and PR references requirement and acceptance IDs (`FR-`, `NFR-`, `AC-`, `S-`).
- Stop for clarification when interpretations differ on behavior, data, permissions, architecture, cost, schedule, or release risk. Otherwise label the assumption and proceed.
- Risk classes requiring explicit owner direction: authentication, authorization, billing, personal data, destructive operations, schema or infrastructure changes, production access.

## Required sequence

1. **Refine** the input into the factory-ready PRD format (`.claude/skills/software-factory`).
2. **Approve**: readiness + owner approval (or prior explicit auto-proceed).
3. **Preflight**: read this file and `docs/architecture/GUARDRAIL_MAP.md`; inspect working state; check open PRs for overlapping files; verify repository evidence still matches the PRD.
4. **Isolate**: harness-managed branch (Claude Code web sessions) or a worktree from `main` for local work. Never implement on the default branch.
5. **Build** the smallest coherent change through the canonical guarded path (below).
6. **Prove**: run required checks and collect runtime evidence in `.artifacts/<task>/` (gitignored); map each AC to pass/fail/untested.
7. **Ship**: PR using `.github/pull_request_template.md`.
8. **Review**: address CodeRabbit findings on the current head, at most 5 cycles; scores are advisory.
9. **Handoff**: stop before merge and deployment.

## Repository commands (planned, not yet real)

S-1 must replace this block with observed commands. Until then these are targets:

- Install: `npm ci`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test` (vitest); focused: `npm run test -- <pattern>`
- End-to-end: `npm run e2e` (Playwright)
- Build: `npm run build`
- Dev server: `npm run dev` on port 3000
- DB: `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`

## Architecture and invariants

Canonical path (details in `docs/architecture/GUARDRAIL_MAP.md`):

```
entry adapter -> requireUser() -> zod parse -> guarded command -> scoped repo -> Postgres constraints -> audit event
```

- Entry adapters: `src/app/api/**/route.ts`, `src/app/api/copilotkit/[[...slug]]/route.ts`, `src/app/api/webhooks/*`, server components.
- Verified request context: `src/server/auth/` (only place that imports `@clerk/nextjs/server`; only constructor of `VerifiedUser`).
- Guarded commands: `src/server/commands/` (authorization, quotas, transactions).
- Scoped data access: `src/server/data/` (only place that imports the Drizzle client; every query filtered by `user_id`).
- AI runtime and prompts: `src/server/ai/` (only place that imports `@copilotkit/runtime*`, `ai`, `@ai-sdk/*`, `@anthropic-ai/sdk`).
- Pure client logic (scene summary, diagram layout, skeleton conversion): `src/lib/`.
- Runtime schemas: `src/server/schemas/` and `src/lib/ai/specs/` (zod).
- Search for an existing pattern and its tests before creating another path. State hypotheses as hypotheses; never invent files or commands.
- Treat every externally reachable route, runtime sub-route, webhook, and agent tool as an entry point.
- Derive principal and tenant server-side; never trust a caller-provided user or project scope by itself.
- Validate untrusted input at runtime; TypeScript alone is not validation. Avoid `any`; narrow `unknown`.
- Enforce object-level authorization in commands/repos; a page or layout check never protects a route.
- Mirror policy to the client only for UX (credits meter, disabled buttons); server decisions are authoritative.
- The LLM agent is a caller with the user's authority; its tool inputs are untrusted and capped; destructive tools require confirmation.
- Keep prompts static (cacheable) and treat canvas text as data, not instructions.

## Isolation and shared resources

- Branch naming: `feat/s<slice>-<slug>` for slice work, `fix/<slug>` for fixes.
- Worktrees (local): `.worktrees/<branch>` (gitignored). Single-checkout mode is allowed only in harness-managed sessions that assign a branch in a fresh container.
- Evidence directory: `.artifacts/<task>/` (gitignored). Approved external evidence host: none; keep evidence in the PR or private.
- Shared resources: Neon — use a per-developer branch, never the production branch; dev port 3000; Clerk dev instance; Railway — creating services, setting variables, or deploying are external actions that need explicit authorization (S-7).

## Verification and evidence

- Every correctness claim references a check, capture, measurement, or stated human judgment.
- Mark blocked checks `untested` with the reason. Never report a skipped check as passed.
- UI: comparable before/after screenshots (headless Playwright is the fallback; no recorder is assumed).
- API: repeatable scripted requests with sanitized outputs.
- Canvas/agent: element dumps plus screenshots; sanitized AG-UI trace excerpts.
- Never record or upload secrets, personal data, prompts, or unrelated screens.

## Pull-request gate

1. Review the complete diff; regenerate lockfiles, never hand-merge them.
2. Update from `main` non-destructively; rerun required checks on the final commit.
3. Fill the PR template: outcome, scope, acceptance-criterion status, verification, evidence, risks, rollback.

Automated reviewer: CodeRabbit. Success signal: review posted for the current head with zero unresolved actionable comments (nits may be dispositioned in a reply). Maximum review cycles: 5. Required human approver: repository owner (TayoAki). CI must be green.

## Safety and authority

- Never commit or force-push to the default branch; never plain `--force`; `--force-with-lease` only on your own task branch when required.
- Never reuse another agent's worktree, branch, uncommitted changes, port, or database branch.
- Never merge, deploy, change production state, install an external app, expand credentials, or run agents in unrestricted permission-bypass mode without explicit authorization.
- Never commit `.env*` files or paste secrets into docs, logs, or evidence.

## Completion report

Return: PRD revision and approval state; branch or PR URL; what changed and why; AC status table; checks with pass/fail/untested; evidence location and revision tested; review iterations and unresolved findings; risks; confirmation that merge/deploy did not occur.

## Deeper guidance

- Delivery workflow: `.claude/skills/software-factory/SKILL.md`
- Guardrail design and audit: `.claude/skills/architectural-guardrails/SKILL.md`
- Product spec: `docs/prds/0001-ai-whiteboard-mvp.md`
- Guardrail map: `docs/architecture/GUARDRAIL_MAP.md`
- Build plan and verified stack facts: `PLAN.md`
