# Repository instructions

Keep only verified, always-needed facts here. Rename or adapt this file for the platform (`AGENTS.md`, `CLAUDE.md`, or a scoped rule).

## Commands

- Install: `<observed command>`
- Typecheck: `<observed command>`
- Lint: `<observed command>`
- Focused tests: `<observed command>`
- Build: `<observed command>`

## Architecture

- Entry adapters: `<paths>`
- Verified request context: `<path>`
- Canonical policy/service boundary: `<path>`
- Scoped data access: `<path>`
- Runtime schemas: `<path>`
- Guardrail tests/rules: `<paths>`

## Invariants

- Search for an existing pattern and its tests before creating another path.
- Treat every externally reachable action/procedure/route as an entry point.
- Derive principal and tenant authority server-side; never trust caller-provided scope by itself.
- Validate untrusted input at runtime; TypeScript alone is not validation.
- Enforce object-level authorization at the canonical boundary.
- Do not import the database/vendor SDK outside the approved layer: `<path or rule>`.
- Mirror policy to clients only for UX; server decisions remain authoritative.
- Run `<required checks>` before claiming completion.

## Work hygiene

- Preserve unrelated changes; inspect status and diff.
- Use the repository's branch/worktree convention: `<observed convention>`.
- Do not use destructive Git or unrestricted permission bypass without explicit, isolated scope.
- State hypotheses as hypotheses and verify them. Never invent files, commands, or patterns.

## Deeper guidance

- Workflow skill: `$architectural-guardrails`
- Scoped rules: `<paths>`
- Security/architecture docs: `<paths>`
