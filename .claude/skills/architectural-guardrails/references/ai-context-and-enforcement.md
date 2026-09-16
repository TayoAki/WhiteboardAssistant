# AI context and enforcement

## Layer repository guidance

Keep the root `CLAUDE.md` or `AGENTS.md` focused on facts needed for almost every task: canonical commands, a brief directory map, high-impact invariants and prohibited bypasses, and pointers to deeper scoped rules and skills.

Place file- or subtree-specific rules near that code. Put repeatable multi-step workflows in skills. Use comments at boundary code to explain why a constraint exists and what path must be used.

Do not assert a deterministic override order for contradictory Claude instruction files. Eliminate contradictions instead.

## Search-first protocol

1. list candidate paths;
2. search names and content;
3. inspect imports/exports and call sites;
4. read the smallest relevant files;
5. inspect adjacent tests/configuration;
6. state the discovered canonical path and uncertainties.

For a suspected pattern, write: “Hypothesis: `<pattern>` exists near `<area>`. Search before creating an alternative.” Then report the evidence. Never tell the model that a nonexistent item definitely exists.

## Permission posture

- Start with read/explore or normal permission mode.
- Allow only known-safe, relevant commands and paths.
- Keep explicit deny rules for secrets, protected paths, and destructive operations.
- Use OS-level sandboxing for untrusted repositories or autonomous execution.
- Review hook code before trusting it; hooks execute with user privileges.
- Use synchronous pre-tool hooks only for deterministic, well-tested checks.
- Do not rely on a prompt instruction to enforce a security boundary.
- Treat unrestricted bypass mode as exceptional and isolated, not a convenience flag.

## Git posture

- Inspect status and diff before editing.
- Preserve unrelated user changes.
- Prefer a dedicated feature branch or linked worktree for material work.
- Keep commits/review units narrow and descriptive.
- Do not use destructive reset, checkout, cleanup, or force operations without explicit, resolved scope.
- Do not treat session checkpoints as durable version control.

## Feedback selection

| Recurring failure | Preferred feedback |
|---|---|
| agent cannot find the intended path | concise instruction, semantic names, nearby example |
| wrong dependency/layer | import/dependency lint rule |
| wrong compile-time key or shape | generated/derived type, strict compiler setting |
| hostile runtime value | boundary schema and bounds |
| missing object/tenant decision | canonical policy function and negative test |
| bypassing the wrapper | entry-point inventory test plus structural rule |
| resource abuse | runtime limiter/budget and alerting |
| subtle semantic regression | focused integration/property/concurrency test |

Avoid adding a new framework or abstraction merely to make the architecture look uniform. A useful guardrail lowers ambiguity and blocks a real failure mode.
