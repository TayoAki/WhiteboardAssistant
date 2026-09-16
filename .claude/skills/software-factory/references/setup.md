# Configure the factory

Use this procedure to add the workflow to a repository without erasing local conventions.

## Contents

1. Inspect before writing
2. Install project guidance
3. Configure PRD intake and the task contract
4. Configure isolation
5. Configure proof
6. Configure review and release gates
7. Add automated intake
8. Dry run

## 1. Inspect before writing

- Locate the repository root and default branch.
- Read existing `AGENTS.md`, `CLAUDE.md`, Cursor rules, nested instruction files, contribution guides, CI definitions, and package scripts.
- Check for existing skills and workflow automation.
- Run `python3 scripts/factory_doctor.py --repo <repo>` from the skill directory.
- Identify the repository's exact install, lint, typecheck, unit, integration, end-to-end, build, and development-server commands.
- Identify sensitive areas: authentication, authorization, money, personal data, migrations, infrastructure, and production operations.

Do not overwrite an existing instruction file. Merge compatible rules, resolve contradictions explicitly, and preserve more specific repository guidance.

## 2. Install project guidance

Use `assets/AGENTS.template.md` as a starting point. Copy it only when no project guidance exists; otherwise merge its sections into the existing root instructions.

Fill every bracketed field that affects execution. Remove irrelevant placeholders. Keep the root file concise; move detailed, conditional procedures into project skills or nested rules.

Project-scoped skill locations:

| Harness | Skills | Root workflow |
|---|---|---|
| Codex | `.agents/skills/<name>/SKILL.md` | `AGENTS.md` |
| Cursor | `.agents/skills/<name>/SKILL.md` or `.cursor/skills/<name>/SKILL.md` | `AGENTS.md` |
| Claude Code | `.claude/skills/<name>/SKILL.md` | `CLAUDE.md` importing `@AGENTS.md` |

Prefer checked-in project skills when cloud or remote agents must use them. Avoid duplicated copies that can drift; use supported imports or symlinks when practical.

## 3. Configure PRD intake and the task contract

Adopt `assets/FACTORY_PRD.template.md` as the normalization target for PRDs, briefs, issues, and feature requests. Store approved PRDs in the repository's existing product-document location when one exists; otherwise keep them in the conversation or establish a documented path such as `docs/prds/`. Do not overwrite source documents by default.

Require intake to label facts, repository evidence, assumptions, recommendations, and decisions needed. Implementation must not start from a `BLOCKED` PRD. Define who can approve a factory-ready PRD and whether explicit auto-proceed is allowed for `READY` or `READY WITH ASSUMPTIONS` work.

Require each issue or prompt to provide:

- problem or desired outcome;
- testable acceptance criteria;
- explicit exclusions;
- affected surface or user flow;
- expected evidence;
- risk classification and approval requirements.

Require stable requirement and acceptance IDs so plans, tests, evidence, and PRs remain traceable to the approved revision.

Do not automate unclear work merely because the agent can start it.

## 4. Configure isolation

- Protect the default branch outside agent instructions.
- Require a unique task branch and distinct worktree unless the harness already supplies equivalent filesystem isolation. State explicitly whether single-checkout mode is allowed.
- Add the selected worktree and evidence directories to `.gitignore`.
- Define a branch naming convention.
- Require a scope check against open PR file lists.
- Document shared ports, databases, test accounts, queues, and other state that worktrees do not isolate.

## 5. Configure proof

Choose evidence appropriate to the repository:

- UI: screenshots or recorded interaction;
- API: scripted requests with sanitized outputs;
- performance: repeatable measurements and thresholds;
- data or migrations: schema checks, dry runs, and reversible test fixtures;
- nonvisual behavior: failing/passing tests, logs, or output pairs.

Define an artifact directory and keep it out of source control. Specify an approved evidence host if artifacts may leave the machine.

Optionally configure compatible `evidence-driven-testing` and `before-and-after` capabilities. Record the exact local skill or command path, required dependencies, headless fallback, preview-protection behavior, and permitted upload host. Do not make an optional third-party executable a hidden requirement.

## 6. Configure review and release gates

- List required CI checks and human approvers.
- Select an optional automated reviewer and define its success signal.
- Set an explicit review-iteration cap; five is the default.
- Require current-head results so stale scores cannot pass the gate.
- Define escalation behavior when feedback conflicts, checks fail repeatedly, or the limit is reached.
- Keep merge and deployment outside the factory unless separately authorized.

When Greptile is used, document the normal trigger, the optional `@greptile-apps` large-change trigger, score/comment gate, timeout, current-head rule, and whether an edited summary is an accepted fallback when no check appears.

Enforce critical rules with repository rulesets, CI, hooks, permissions, and environment protection. Natural-language instructions guide agents but are not enforcement boundaries.

## 7. Add automated intake only after the local flow works

An issue-tracker connector provides data and actions; it does not by itself schedule an agent. Add a webhook, automation, or cloud-agent trigger separately.

Give the launched agent:

- the issue identifier, source PRD, and approved factory-ready PRD revision;
- the repository and correct working directory;
- environment bootstrap and test commands;
- least-privilege credentials;
- the instruction to stop before merge/deploy;
- a time, token, and review-iteration budget.

Prove the workflow manually on a small change before enabling unattended intake.

## 8. Dry run

Use a small visible defect or harmless feature. Verify that the agent:

1. resolves the task contract;
2. stays off the default branch in a dedicated worktree, unless single-checkout mode was explicitly authorized;
3. checks overlap;
4. captures the baseline;
5. changes only the intended scope;
6. runs required checks;
7. verifies runtime behavior;
8. produces a reviewable PR or local handoff;
9. stops at the configured review cap;
10. does not merge or deploy.
