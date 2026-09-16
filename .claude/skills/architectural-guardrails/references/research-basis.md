# Research basis and transcript corrections

Use this reference when a recommendation depends on tool or framework behavior. It records the evidence boundary behind the workflow; it is not a substitute for inspecting the user's current versions.

## Supported core idea

The transcript's strongest idea is that recurring architectural decisions should become observable constraints: canonical entry paths, types, schemas, lint rules, tests, hooks, database constraints, and CI. Concise instructions help agents discover those constraints, but the constraints—not the prose—supply enforcement.

This is a synthesis across the primary sources below rather than a claim that one vendor publishes the whole pattern.

## Claims to preserve with qualifications

| Topic | Research-backed interpretation |
|---|---|
| Search-first work | Narrow file and content discovery preserves context and exposes existing patterns. Search imports, exports, call sites, tests, and config—not just magic phrases. |
| `CLAUDE.md` | Keep short, stable, always-needed commands and invariants in project instructions. Move multi-step procedures to skills and file-specific guidance to scoped rules. Contradictory files are not a deterministic override system. |
| Hooks | Synchronous pre-tool hooks can block operations, including in bypass mode, but hook code executes with the user's OS permissions and must itself be trusted and reviewed. |
| Protected procedures | Reusable procedures/middleware can establish verified request preconditions. Each exposed procedure must inherit the right base, and object access still needs a target-specific decision. |
| Client mirror | Shared declarative policy may improve UX, but server-side policy remains authoritative. Do not send secrets or privileged policy inputs to the client. |
| ORM/adapters | They reduce coupling for common operations. Provider-specific migrations, types, features, raw SQL, semantics, and operations still make swaps real projects. |
| Audit middleware | Central middleware is useful for correlation and common fields. A security audit event still needs identity, tenant, action, target, outcome/reason, redaction, integrity, retention, and monitoring. |

## Claims corrected or rejected

| Transcript claim | Correction |
|---|---|
| Start Claude Code with unrestricted permission bypass | Do not make this the default. Anthropic limits bypass mode to isolated environments where damage and credential/data exfiltration are contained. Prefer explicit permissions, deny rules, sandboxing, and reviewed hooks. |
| Do not use Git because the agent can undo work | Use Git status/diff and isolated branches or worktrees as recovery and review controls. Avoid destructive or out-of-scope Git. Claude checkpoints do not cover every mutation and are not a Git replacement. |
| `server-only` makes functions unreachable | `server-only` prevents inappropriate client imports. In-use Server Actions are callable entry points and require their own authentication, authorization, validation, and abuse controls. |
| TypeScript proves runtime safety; never use `unknown` | TypeScript types are erased at runtime. Validate untrusted input. `unknown` is safer than `any` because consumers must narrow it before use. |
| An authenticated or role-checked wrapper proves authorization | Authentication and broad roles do not prove tenant membership or access to a specific object/property. Check all relevant dimensions server-side. |
| One global/IP rate limiter is enough | Bound the expensive unit: user/client/tenant/operation, payload, batch size, page size, concurrency, timeout, and downstream provider spend as applicable. |
| Central logging automatically creates an audit trail | Observability middleware is not sufficient. Define security events, fields, redaction, log-injection defense, integrity, access, retention, and alerting. |
| An ORM makes database switching effortless | Prisma explicitly documents provider-specific migration histories and feature support. Adapters help, but migrations and data movement remain. |
| Delete documentation and rely only on inline injection | Use layered documentation: concise root instructions, path-scoped rules, skills for procedures, and comments for non-obvious architectural reasons. |
| Tell the agent something exists even when it may not | Preserve epistemic integrity: state a hypothesis, search, and report what was or was not found. |
| Testimonials and productivity counts prove the method | Treat them as anecdotes. Do not repeat percentages, feature counts, speed claims, or security guarantees without independent evidence. |

## Primary sources

- Anthropic, [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- Anthropic, [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- Anthropic, [Choose a permission mode](https://code.claude.com/docs/en/permission-modes)
- Anthropic, [Configure permissions](https://code.claude.com/docs/en/permissions)
- Anthropic, [Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide)
- Anthropic, [Hooks reference and security considerations](https://code.claude.com/docs/en/hooks#security-considerations)
- Anthropic, [Checkpointing](https://code.claude.com/docs/en/checkpointing)
- Next.js, [`use server`](https://nextjs.org/docs/app/api-reference/directives/use-server)
- Next.js, [Data Security](https://nextjs.org/docs/app/guides/data-security)
- tRPC, [Procedures](https://trpc.io/docs/server/procedures), [Context](https://trpc.io/docs/server/context), [Middlewares](https://trpc.io/docs/server/middlewares), and [Authorization](https://trpc.io/docs/server/authorization)
- TypeScript, [Erased Types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types) and [`unknown`](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- Zod, [Basic usage](https://zod.dev/basics)
- ESLint, [Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)
- OWASP, [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- OWASP, [Multi Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- OWASP, [API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- OWASP, [API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- OWASP, [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Prisma, [Database features](https://www.prisma.io/docs/orm/v7/reference/database-features) and [Migrate limitations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)
- Git, [`git worktree`](https://git-scm.com/docs/git-worktree)

## Evidence limits

- Exact rate thresholds, tenant strategy, transaction ordering, and audit retention are system-specific.
- The canonical adapter/policy architecture is a synthesis, not a framework guarantee.
- Static rules and keyword scanners can miss aliases, reflection, generated code, non-code paths, and privileged infrastructure access.
- Current product behavior may differ by version, plan, configuration, and execution surface. Inspect local versions and official docs for consequential implementation choices.
