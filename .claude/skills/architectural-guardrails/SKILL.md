---
name: architectural-guardrails
description: Design, retrofit, implement, or audit executable architectural guardrails for AI-assisted software repositories. Use when a user asks for guardrail coding, code-as-policy, pattern-driven architecture, a protected procedure or mutation boundary, tenant/auth/permission/plan/rate-limit/audit enforcement, source-of-truth registries, safe Claude Code or ChatGPT repository instructions, search-first workflows, or an analysis of whether routes, Server Actions, APIs, jobs, webhooks, SDKs, or database access bypass canonical controls. Also use to turn an existing PRD or feature plan into guardrail requirements; pair with software-factory when the user also wants the full PRD-to-PR delivery lifecycle.
---

# Architectural Guardrails

## Purpose

Turn important architectural rules into constraints the repository can detect or enforce. Treat prompts and comments as navigation; use server-side policy, schemas, types, lint rules, tests, hooks, database constraints, and CI as the actual guardrails.

The target is a narrow, understandable path through the system—not a giant abstraction layer. Preserve the project's native stack and patterns unless evidence shows they are unsafe or missing.

## Choose the mode

Select the smallest mode that answers the request:

1. **Assess** — map trust boundaries, authorities, entry points, existing patterns, and bypasses.
2. **Design** — propose a minimal guardrail spine and phased adoption plan.
3. **Retrofit** — add guardrails to an existing repository without a broad rewrite.
4. **Feature** — implement a feature through the repository's canonical guarded path.
5. **Audit** — prove or disprove coverage across all externally reachable and privileged paths.
6. **PRD hardening** — rewrite a PRD so every consequential policy has an authority, enforcement point, negative case, evidence command, and explicit exception process.

If the request includes PRD normalization, isolated Git work, implementation, tests, pull request creation, and review closure, invoke `$software-factory` first when available. Use this skill to define and verify the architectural guardrails inside that lifecycle.

## Non-negotiable distinctions

- **Guidance is not enforcement.** `CLAUDE.md`, `AGENTS.md`, skills, comments, and examples influence behavior but do not prove compliance.
- **Client visibility is not authorization.** Hiding a control or mirroring a policy in the UI improves UX only. Recheck authorization server-side.
- **Authentication is not object access.** Validate the action, tenant, requested object, and relevant field-level permissions.
- **Static types are not runtime validation.** Parse untrusted input at the boundary. Avoid `any`; use `unknown` when a value is genuinely unknown, then narrow or validate it.
- **A server module is not automatically secure.** `server-only` protects bundling boundaries; Server Actions and procedures are still callable entry points and need authentication, authorization, validation, and abuse controls.
- **An adapter reduces coupling; it does not erase migration cost.** Provider-specific schemas, migrations, semantics, features, and operations remain.
- **One source of truth is contextual.** Centralize a policy only when it is genuinely canonical. Split registries by concern and ownership rather than creating a god object.
- **Never invent repository facts.** Phrase uncertainty as a hypothesis, search for it, and report found/not found. Do not use a false claim to make an agent search.
- **Do not recommend permission bypass by default.** Use least privilege, explicit allow/deny rules, sandboxing, and reviewed hooks. Reserve bypass modes for isolated, disposable environments where accessible data and credentials cannot be harmed or exfiltrated.
- **Claude checkpoints are not Git.** Preserve user changes, inspect status/diff, and use a dedicated branch or worktree for material changes. Never use destructive Git to tidy an unknown workspace.

Read [research-basis.md](references/research-basis.md) when a recommendation depends on Claude Code, Next.js, tRPC, TypeScript, ESLint, Prisma, or security behavior. Read [guardrail-patterns.md](references/guardrail-patterns.md) before designing or implementing enforcement. Read [ai-context-and-enforcement.md](references/ai-context-and-enforcement.md) before changing `CLAUDE.md`, `AGENTS.md`, hooks, or permission settings.

## Workflow

### 1. Establish the contract

State the requested outcome, mode, in-scope repository or subsystem, and whether code changes are authorized. Ask only for facts that materially change the design.

For each consequential concern, capture:

| Concern | Authority | Trusted inputs | Enforcement point | Deny behavior | Evidence |
|---|---|---|---|---|---|
| Example: update project | membership service + project owner | verified principal, server-resolved tenant | canonical mutation boundary + scoped data access | deny before mutation | negative integration test |

At minimum consider identity, tenant scope, object access, roles/permissions, plans/quotas, validation, rate/cost limits, audit events, error disclosure, idempotency, and data integrity.

### 2. Map before reading broadly

Use repository-native discovery tools. Prefer filename and match lists before full-file reads:

```bash
rg --files -g '!*node_modules*' -g '!*dist*' -g '!*build*'
rg -l "protectedProcedure|createContext|use server|server-only|authorize|permission|tenant|organization|rate.?limit|audit" .
rg -n "prisma\.|db\.|publicProcedure|use server|tenantId|organizationId" src app packages
```

Adapt paths and commands to the repository. Search semantic names, imports, exports, call sites, tests, and configuration; do not depend on magic keywords alone. Run `scripts/guardrail_doctor.py --repo <path>` for a safe heuristic inventory when useful. Its output is discovery evidence, never a security proof.

Build a Guardrail Map using [GUARDRAIL_MAP.template.md](assets/GUARDRAIL_MAP.template.md). Inventory at least:

- browser/client calls;
- API routes, RPC procedures, GraphQL resolvers, and Server Actions;
- webhooks, queues, cron/jobs, workers, and admin/CLI operations;
- third-party SDKs and direct data-store access;
- authentication/session construction;
- database constraints, row-level policy, and privileged service accounts;
- static checks, tests, hooks, and CI gates.

### 3. Trace one canonical path

Trace a representative read and mutation from entry point to persisted side effect. Mark where each policy is decided and where caller-controlled values become trusted.

Prefer a linear path such as:

```text
entry adapter -> verified request context -> policy boundary -> domain/service -> scoped data access -> persistence
```

Thin adapters may differ by framework, but object-level decisions should converge on canonical domain or data-access policy. Treat alternate entry points as first-class callers, not exceptions hidden from the map.

### 4. Design the smallest guardrail spine

Choose only controls justified by the contract and current architecture:

- typed resource/action keys and small policy registries;
- runtime schemas for untrusted input;
- server-derived principal and tenant context;
- reusable authenticated/tenant-aware procedure or command builders;
- object-level authorization in the canonical service or data-access layer;
- scoped repositories, query helpers, or database policy as defense in depth;
- per-operation resource and spend limits;
- structured audit events emitted after a known outcome;
- stable domain adapters around replaceable vendors;
- dependency/import rules preventing forbidden layer crossings;
- negative-path tests and CI gates.

Record order, failure mode, and transaction boundary. A common mutation order is:

1. authenticate;
2. resolve and verify tenant/membership;
3. parse and normalize input;
4. authorize action and target object;
5. reserve or check quota/rate/cost budget;
6. perform the domain operation atomically where required;
7. emit a redacted audit event with outcome;
8. return a minimal result or sanitized error.

This order is a starting point, not a universal law. Move checks deliberately when existence privacy, timing, idempotency, or transactional consistency requires it.

### 5. Plan incremental adoption

Avoid a repository-wide rewrite. Use a vertical slice:

1. add characterization and negative-path tests;
2. introduce the canonical policy/context primitive;
3. migrate one representative path end to end;
4. prove denied, cross-tenant, invalid, repeated, and failure cases;
5. add a static or CI rule that blocks the old bypass;
6. migrate remaining paths in bounded batches;
7. document approved exceptions with owner and expiry.

For PRDs, convert each policy sentence into:

```markdown
- Rule:
- Authority/source of truth:
- Enforcement point(s):
- Forbidden bypass:
- Positive behavior:
- Negative/abuse behavior:
- Evidence command or test:
- Observability/audit requirement:
- Exception owner and expiry:
```

### 6. Implement within authorization

If code changes are authorized:

- inspect local instructions and dirty state first;
- preserve project-native commands and package manager;
- work on a dedicated branch/worktree when practical;
- reuse existing primitives before creating new ones;
- keep the patch narrow enough to review;
- add a failing or characterization check before changing consequential behavior;
- never weaken an existing guardrail merely to make a check pass;
- do not claim coverage beyond observed evidence.

If asked only to assess, review, or plan, do not mutate the repository.

### 7. Audit bypasses

Search for every route around the canonical path. At minimum test or inspect:

- unauthenticated and wrong-role calls;
- cross-tenant identifiers and stale membership;
- valid role against an unauthorized object;
- direct service, ORM, SDK, or database imports;
- Server Actions protected only by page/layout checks;
- jobs/webhooks that manufacture trusted context;
- batch, pagination, upload, timeout, concurrency, and downstream-spend abuse;
- audit events containing secrets or raw request bodies;
- exceptions, disable comments, skipped tests, and CI overrides;
- third-party components that write directly around policy.

Classify each bypass as **blocked**, **explicit exception**, **unverified**, or **open gap**. Never equate absence of a grep match with proof of absence.

### 8. Verify in layers

Run the cheapest relevant checks first, then broaden:

1. schema/type generation if applicable;
2. focused typecheck and lint rules;
3. unit tests for policy decisions;
4. negative integration tests at each entry adapter;
5. transaction/idempotency/concurrency tests where relevant;
6. repository-native build and broader test suite;
7. runtime evidence for the representative path;
8. changed-file and bypass review.

Report exact commands, results, skipped checks, environment limits, and residual risks. Lint, types, or a green happy-path test alone are not sufficient security evidence.

### 9. Improve the feedback system

When a failure recurs, strengthen the earliest reliable guardrail:

- unclear invariant -> concise root or path-scoped instruction;
- wrong import/layer -> lint or dependency rule;
- unsafe data shape -> runtime schema and type derivation;
- missing authorization -> canonical policy function plus negative test;
- entry-point bypass -> route/procedure builder plus inventory test;
- operational abuse -> runtime budget plus monitoring;
- subtle regression -> targeted test and CI gate.

Keep root instructions short and stable. Move multi-step procedures into skills and local rules near the affected code. Comments should explain the non-obvious **why** at architectural boundaries, not duplicate the implementation.

## Required output

Return the smallest useful set of artifacts for the selected mode:

1. **Direct finding** — what is safe, missing, or recommended.
2. **Guardrail Map** — concern, authority, enforcement, evidence, bypass status.
3. **Proposed or completed changes** — ordered by dependency and risk.
4. **Verification Matrix** — positive, negative, abuse, and bypass cases with evidence.
5. **Exceptions and residual risks** — owner/expiry where known; label unknowns.
6. **Next bounded action** — the smallest step that improves real enforcement.

Do not market the architecture with unsupported productivity percentages, feature counts, or claims of perfect portability/security. Separate transcript anecdotes, external facts, repository observations, and design inferences.

## Platform portability

This skill is intentionally portable:

- In ChatGPT/Codex, install and invoke it as `$architectural-guardrails`; place stable repository rules in `AGENTS.md` where supported.
- In Claude Code, copy the skill directory into the supported skills location and invoke it explicitly or through its description; use concise `CLAUDE.md` plus path-scoped rules for always-needed repository facts.
- On either platform, adapt tool names while preserving the sequence: map, trace, design, enforce, audit, verify, improve.

Use [AI_INSTRUCTIONS.template.md](assets/AI_INSTRUCTIONS.template.md) as a starting point, then replace placeholders with observed facts. Instructions that claim nonexistent files, scripts, or architecture are defects.
