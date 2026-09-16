---
name: software-factory
description: Rewrite raw PRDs into factory-ready implementation specifications, then configure, run, or audit a repository workflow that takes approved requirements through isolated Git work, project-native implementation, tests and runtime evidence, a pull request, a bounded review-feedback loop, and a human merge gate. Use when the user provides a PRD or product brief to improve for agent execution, asks to set up or replicate a software factory, wants a feature or fix delivered through an evidence-backed PR workflow, standardizes agent development across ChatGPT/Codex/Claude Code/Cursor, or assesses an existing agent coding pipeline. Do not trigger for ordinary code edits unless the user explicitly asks to use the factory workflow.
---

# Software Factory

Turn a product request into an approved, traceable specification and then a controlled, reviewable delivery pipeline. Keep the workflow portable across agent harnesses; adapt interaction methods, commands, architecture, evidence, and review providers to the repository.

## Select the operation

- **Refine PRD:** This is the default when the user supplies a PRD, brief, issue, or product idea. Read [references/prd-intake.md](references/prd-intake.md) and use [assets/FACTORY_PRD.template.md](assets/FACTORY_PRD.template.md). Diagnose the source, resolve or expose material gaps, and return a factory-ready PRD without overwriting the source. Stop before implementation unless the user also requested **Run** and has approved the rewrite or explicitly authorized auto-proceed.
- **Configure:** Inspect a repository and install or merge the workflow instructions. Read [references/setup.md](references/setup.md). Use [assets/AGENTS.template.md](assets/AGENTS.template.md) as a merge source, never as permission to overwrite existing instructions.
- **Run:** Take one approved factory-ready PRD, scoped feature, fix, or maintenance task through the factory. If the input has not passed PRD intake, read [references/prd-intake.md](references/prd-intake.md) first. Then read [references/execution.md](references/execution.md) and [references/evidence.md](references/evidence.md). Read [references/architecture.md](references/architecture.md) when the change shares operational mechanics across flows or proposes a service extraction. Read [references/integrations.md](references/integrations.md) when selecting worktree, capture, before/after, VCS, or review-provider adapters. Read [references/review-loop.md](references/review-loop.md) only when a PR review service or iterative review is part of the authorized task.
- **Audit:** Compare an existing workflow with the invariants and gates below. Report gaps and prioritized corrections; do not modify the repository unless asked.

For setup or audit, run `python3 scripts/factory_doctor.py --repo <path>` from this skill directory when shell access is available. Add `--require-evidence`, `--require-review`, or `--require-remote` only when those capabilities are intended.

## Preserve these invariants

1. Preserve the source PRD's intent. Do not silently invent users, business rules, metrics, dates, integrations, designs, or technical constraints. Separate supplied facts, repository evidence, assumptions, recommendations, and unresolved decisions.
2. Do not implement from a raw or materially ambiguous PRD. First produce a factory-ready rewrite with stable requirement IDs, observable acceptance criteria, exclusions, risks, and an evidence plan. Require approval unless the user explicitly authorized auto-proceed and no material blocker remains.
3. Treat the approved factory-ready PRD and its acceptance criteria as the task contract. Stop for clarification when different interpretations would materially change behavior, data, permissions, architecture, cost, schedule, or release risk.
4. Never implement on the protected default branch. Use the harness-managed worktree when one already exists; otherwise create a unique task branch and a distinct worktree without disturbing unrelated work. Merely switching the shared checkout to a new branch does not satisfy factory isolation unless the user explicitly authorizes single-checkout mode.
5. Check open changes for file or subsystem overlap before editing. Worktrees isolate files, not integration conflicts, ports, databases, schemas, or external state.
6. Follow the repository's established architecture unless the approved PRD explicitly requests a migration. When two or more flows share operational mechanics, consider separating domain orchestration from reusable capabilities using [references/architecture.md](references/architecture.md); do not impose that pattern on single-use logic or a codebase with a different established boundary.
7. Reproduce a defect or capture a baseline before changing behavior when feasible. Run repository checks and collect runtime evidence; neither substitutes for the other.
8. Keep every correctness claim traceable to an acceptance criterion and a check, capture, measured output, or stated human judgment. Mark blocked checks as `untested` with the reason.
9. Treat reviewer scores and AI comments as advisory signals, not proof of correctness or security. Bound review cycles; default to five unless the repository specifies another limit.
10. Never expose secrets, private data, customer information, payment details, or protected screens in PRDs, logs, or evidence. Assume public upload endpoints are public.
11. Never merge, deploy, change production state, install an external app, or expand credentials unless the user explicitly authorizes that action. A request to implement code does not automatically authorize those actions.
12. Finish with a human decision point. Return the approved specification, branch or PR, evidence, checks, risks, and unresolved items.

## Execute the common pipeline

1. **Ingest:** Preserve the source PRD and identify its stated facts, goals, users, constraints, and omissions.
2. **Rewrite:** Produce a factory-ready PRD with requirement IDs, testable acceptance criteria, non-goals, risks, evidence mapping, rollout, and open decisions.
3. **Gate:** Mark it `READY`, `READY WITH ASSUMPTIONS`, or `BLOCKED`. Obtain approval or the user's prior auto-proceed authorization before implementation.
4. **Contract:** Derive scope, acceptance criteria, exclusions, risk level, implementation slices, and required evidence from the approved PRD.
5. **Preflight:** Inspect instructions, working state, open PRs, runtime requirements, and relevant code. Identify stop conditions before editing.
6. **Isolate:** Work in a unique task worktree and branch or verify the harness-provided isolation. Confirm the dedicated path with `git worktree list` before editing.
7. **Build:** Make the smallest coherent change using repository-native patterns. Keep every slice traceable to requirement IDs. Extract shared mechanics only when the architecture gate passes.
8. **Prove:** Run deterministic checks and verify the real behavior. Map evidence back to acceptance criteria and capture comparable before/after evidence when behavior changed; use an integrated adapter only after its preflight and authorization checks pass.
9. **Ship:** If authorized, commit, update from the default branch safely, rerun checks, push, and open or update a PR with evidence and risks.
10. **Review:** If authorized and configured, iterate on current-head review feedback until the gate passes or the limit is reached.
11. **Handoff:** Stop before merge. Present what changed, verified results, evidence locations, risks, and the exact next human action.

## Use proportional rigor

- For documentation-only or trivial internal changes, use lightweight evidence and skip unavailable external review unless policy requires it.
- For UI behavior, capture the same viewport and state before and after.
- For APIs, migrations, authorization, billing, security, destructive operations, or production-affecting changes, require explicit risk analysis and stronger human approval.
- For ambiguous or cross-cutting work, add a planning checkpoint before isolation and implementation.
- For PRD-only requests, complete the rewrite and approval handoff, then stop; repository access is optional.

## Produce a complete handoff

Report:

- factory-ready PRD readiness, approval state, assumptions, and unresolved decisions;
- task contract, requirement traceability, and any approved deviations;
- branch/worktree or PR URL;
- files and behavior changed;
- checks run with pass/fail/untested status;
- runtime evidence and environment/commit tested;
- review iterations and unresolved feedback;
- security, privacy, migration, rollout, and follow-up risks;
- confirmation that merge and deployment were not performed unless separately authorized.
