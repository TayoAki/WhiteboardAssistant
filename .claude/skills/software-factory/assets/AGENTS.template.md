# Repository agent workflow

Use this file as a project-specific operating contract. Replace bracketed values and remove irrelevant placeholders before adoption.

## Task contract

- Treat a raw PRD, product brief, issue, or product idea as input to refine, not as permission to implement.
- Rewrite raw input into the factory-ready PRD format, preserve the source, and label facts, repository evidence, assumptions, recommendations, and decisions needed.
- Confirm stable requirement IDs, testable acceptance criteria, exclusions, evidence expectations, and readiness before implementation.
- Do not implement a `BLOCKED` PRD. Require approval of the rewritten revision unless explicit auto-proceed was authorized for non-blocked work.
- State exclusions and evidence expectations.
- Classify risk as low, medium, or high.
- Stop for clarification when different interpretations change behavior, data, permissions, architecture, cost, schedule, or release risk.

## Required sequence

1. **Refine:** Diagnose the source PRD and produce a factory-ready rewrite with requirement IDs, acceptance criteria, non-goals, risks, evidence mapping, and open decisions.
2. **Approve:** Mark readiness and obtain approval or verify prior auto-proceed authorization. Stop if `BLOCKED`.
3. **Preflight:** Read applicable instructions, inspect working state, identify open-change overlap, locate relevant code and tests, and verify repository evidence does not invalidate the PRD.
4. **Isolate:** Use the harness-managed task worktree when present; otherwise create a unique branch and distinct worktree from `[default branch]`. Never implement on the protected default branch. Do not treat switching the shared checkout to a feature branch as equivalent unless single-checkout mode is explicitly authorized.
5. **Build:** Follow repository-native architecture, make the smallest coherent change, and preserve traceability to requirement IDs.
6. **Prove:** Run required checks and verify the real behavior. Map each acceptance criterion to evidence and capture a baseline before changing behavior when feasible.
7. **Ship:** When authorized, prepare a PR with the approved PRD revision, contract, verification, evidence, risks, and rollback/follow-up notes.
8. **Review:** When configured, address current-head automated review through at most `[5]` cycles. Stop on conflicts, timeouts, or material scope expansion.
9. **Handoff:** Present the branch or PR and stop before merge or deployment.

## Repository commands

- Runtime/toolchain: `[versions and version manager]`
- Install: `[command]`
- Format/lint: `[command]`
- Typecheck/compile: `[command]`
- Focused tests: `[command pattern]`
- Full unit/integration tests: `[command]`
- Build: `[command]`
- End-to-end tests: `[command]`
- Development server: `[command and port]`

Do not claim a placeholder command was run. Ask for or discover the real command before relying on it.

## Architecture and invariants

- `[primary architecture boundary]`
- `[dependency direction]`
- `[database and transaction ownership]`
- `[error/result convention]`
- `[authorization boundary]`
- `[migration policy]`
- `[generated-file policy]`

Follow established repository patterns unless the task explicitly authorizes an architectural migration. Avoid unrelated refactors and dependency upgrades.

When two or more flows share operational mechanics, separate domain orchestration (why/when, authorization, state, user-facing failure) from reusable capabilities (provider/SDK operations, readiness, structured results) only if that matches repository conventions. Do not create a service abstraction for speculative or single-use logic.

## Isolation and shared resources

- Branch naming: `[convention]`
- Worktree directory: `[gitignored path or harness-managed]`
- Single-checkout mode: `[disallowed unless explicitly authorized]`
- Evidence directory: `.artifacts/<task>/` and gitignored
- Shared ports: `[list or allocation rule]`
- Shared databases/queues: `[isolation rule]`
- Test accounts/fixtures: `[approved sources]`

Worktrees do not isolate ports, databases, schemas, queues, external services, or integration conflicts. Confirm resource ownership before trusting a running system.

## Verification and evidence

- Every correctness claim must reference a check, capture, measurement, or stated human judgment.
- Mark blocked checks as `untested` with a reason.
- UI changes require comparable before/after states or a recorded flow.
- API and performance changes require repeatable probes and sanitized outputs.
- Bug fixes should preserve the pre-fix reproduction when feasible.
- Evidence complements tests; it does not replace them.
- Never record or upload secrets, personal data, customer content, payment details, or unrelated screens.
- Approved evidence host: `[private host or none]`.
- Optional evidence recorder or companion skill: `[path/name or none]`.
- Before/after command and approved upload behavior: `[command/private host/local only]`.

## Pull-request gate

Before opening or updating a PR:

1. Review the complete diff.
2. Update safely from the default branch.
3. Rerun required checks on the final commit.
4. Include outcome, scope, acceptance-criterion status, verification, evidence, risks, and rollback/follow-up.

Automated reviewer: `[provider or none]`

Large-change review fallback: `[provider trigger or none]`

Review success signal: `[conclusion/score]`

Maximum review cycles: `[5]`

Required human approver: `[role/person]`

## Safety and authority

- Never commit or force-push to the protected default branch.
- Never use another agent's worktree, branch, uncommitted changes, port, or test database.
- Never use plain `--force`; use `--force-with-lease` only for an authorized update to the task's own branch.
- Never merge, deploy, change production state, install an external app, or expand credentials without explicit authorization.
- Require human approval for authentication, authorization, billing, sensitive data, destructive operations, migrations, infrastructure, and production-affecting changes.

## Completion

Return:

- factory-ready PRD revision, readiness, approval state, assumptions, and unresolved decisions;
- branch/worktree or PR URL;
- what changed and why;
- acceptance-criterion status;
- checks with pass/fail/untested status;
- evidence and exact revision/environment tested;
- review iterations and unresolved findings;
- security, privacy, migration, rollout, and follow-up risks;
- confirmation that merge/deployment was not performed unless separately authorized.
