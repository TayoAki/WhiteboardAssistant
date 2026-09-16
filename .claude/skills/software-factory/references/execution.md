# Execute one factory task

## Contents

0. Refine and approve the PRD
1. Establish the contract
2. Preflight and overlap check
3. Isolate the work
4. Build within repository conventions
5. Prove behavior
6. Prepare the pull request
7. Review and hand off

## 0. Refine and approve the PRD

When the input is a raw PRD, product brief, issue, transcript, or loosely scoped request, read `references/prd-intake.md` and rewrite it before editing code. Preserve the source, use stable requirement and acceptance IDs, and surface material decisions instead of guessing.

Do not begin implementation while readiness is `BLOCKED`. Require the user's approval of the rewritten PRD unless they explicitly authorized auto-proceed and readiness is `READY` or `READY WITH ASSUMPTIONS`. If the task starts from an already approved factory-ready PRD, record its revision and approval state.

## 1. Establish the contract

Before editing, write a compact task contract:

```text
Source PRD and revision:
Approval state:
Outcome:
Requirement and acceptance IDs:
Out of scope:
Risk level: low | medium | high
Required checks:
Required evidence:
Authorized external actions:
Stop conditions:
```

Derive the contract from the approved PRD. Infer only low-impact details that are reversible and consistent with the PRD and repository. Ask when a choice changes product behavior, data, permissions, architecture, cost, schedule, or release risk.

High-risk work includes authentication, authorization, billing, personal data, destructive operations, schema or infrastructure changes, and production access. Require explicit user direction for irreversible or externally consequential decisions.

## 2. Preflight and overlap check

- Read the applicable instruction chain and contribution guidance.
- Inspect the working tree without altering it.
- Determine the default branch from repository configuration rather than assuming `main` when possible.
- Fetch remote state if network mutation is authorized and needed.
- List open PRs/MRs and inspect changed files in plausible overlaps.
- Search the codebase for the current behavior, adjacent tests, architecture patterns, and ownership boundaries.
- Identify required tools, credentials, ports, services, fixtures, and test accounts.
- Compare repository evidence with the PRD. Return to PRD intake and request reapproval if a material requirement or assumption is invalidated.

Stop when another active change overlaps the same critical files and integration order cannot be established safely.

## 3. Isolate the work

If the harness already assigned a worktree, use it. Verify its branch and do not create nested isolation. A harness-created branch in a shared checkout is not equivalent to a dedicated worktree unless that harness documents equivalent filesystem isolation.

Otherwise:

1. Create a unique task name using the repository convention.
2. Create a new branch and worktree from the latest authorized default-branch state.
3. Enter the worktree and confirm the branch is not the protected default.
4. Install dependencies inside the worktree using the repository's locked versions.
5. Confirm any development-server port belongs to this worktree's process.

Before editing, run `git worktree list` and verify that the current path is the task's dedicated worktree. If isolation cannot be created safely, stop and request permission for explicit single-checkout mode rather than silently degrading to branch-only work.

Never reuse another agent's worktree, branch, uncommitted changes, port, or test database. Never force-delete a worktree or branch to bypass a naming collision.

## 4. Build within repository conventions

- Capture the defect or behavioral baseline before fixing it when feasible.
- Implement the smallest coherent change that satisfies the contract.
- Keep plan slices, tests, commits, and change notes traceable to the PRD's requirement and acceptance IDs.
- Follow existing boundaries, naming, dependency direction, error semantics, and test style.
- Keep business policy in the layer that already owns it.
- When two or more approved flows share operational mechanics, read `references/architecture.md` and apply its gate. Keep single-use and domain-specific logic local.
- Avoid unrelated refactors, dependency upgrades, formatting churn, and generated-file changes.
- Treat lockfiles as generated outputs; regenerate rather than hand-merging conflicts.

Checkpoint after each meaningful slice. Run the cheapest relevant check early instead of accumulating avoidable failures.

## 5. Prove behavior

Read `references/evidence.md` and select the evidence type before the final validation run. Read `references/integrations.md` before using a companion recorder, before/after tool, or review adapter.

Run the repository-defined stack applicable to the change, such as:

- formatter or lint;
- typecheck or compile;
- focused tests;
- broader unit/integration tests;
- build;
- end-to-end or manual runtime verification;
- security or migration checks for affected surfaces.

Record the exact command, result, environment, branch, and commit. Do not report a skipped or blocked check as passed.
Map every acceptance criterion to pass, fail, or untested status and its evidence. A passing test that does not exercise the criterion is not evidence for that criterion.

## 6. Prepare the pull request

Only push or create a PR/MR when the user has authorized that external action.

Before pushing:

1. Review the full diff and generated files.
2. Rebase or update using the repository's non-destructive convention.
3. Rerun required checks on the final commit.
4. Use `--force-with-lease` only when the repository workflow requires updating the agent's own rebased branch; never plain force and never against the default branch.

Structure the PR body as:

```markdown
## Outcome

## What changed

## Acceptance criteria

| ID | Requirement | Status | Evidence |
|---|---|---|---|

## Verification
| Check | Result | Evidence |
|---|---|---|

## Before and after

## Risks and untested cases

## Rollback or follow-up
```

Ensure evidence URLs are accessible to reviewers and contain no sensitive information.

## 7. Review and hand off

When iterative automated review is configured and authorized, read `references/review-loop.md`. Otherwise request or await human review.

Return:

- local branch/worktree or PR/MR URL;
- concise change summary;
- approved PRD revision and any approved deviations;
- acceptance-criterion status by ID;
- checks and evidence;
- review iteration count;
- unresolved comments or blocked checks;
- risks and suggested reviewer focus;
- explicit statement that merge/deploy did or did not occur.

Keep the task worktree until the PR is merged or closed. Clean it up only after confirming that disposition and that no unique uncommitted work remains.
