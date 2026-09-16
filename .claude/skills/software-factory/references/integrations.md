# Select factory adapters

The factory can use built-in tools, repository commands, or compatible companion skills. Select by capability and environment; never assume a named CLI, skill, credential, GUI, or external service is available.

## Companion capability routing

| Capability | Prefer when available | Integrated fallback |
|---|---|---|
| Task isolation | Harness-managed worktree or a compatible `new-feature` skill | Follow the isolation procedure in `execution.md` |
| Shared-code design | Repository guidance or a compatible `code-structure` skill | Apply `architecture.md` conditionally |
| Live evidence | A compatible `evidence-driven-testing` skill and its verified recorder | Use screenshots, scripted probes, or a repository-native recorder |
| Visual comparison | A compatible `before-and-after` skill or `@vercel/before-and-after` CLI | Produce equivalent paired captures and a Markdown comparison |
| Review loop | Repository-native review automation or a compatible `greploop` skill | Follow `review-loop.md` |
| Large Greptile review | A configured `greploop-apps` integration | Use the edited-summary fallback described below |

If a companion skill is installed, read its current instructions before using its scripts. Companion instructions do not override the approved PRD, repository rules, user authorization, privacy requirements, iteration cap, or human merge gate.

Do not install a CLI, skill, app, browser extension, recorder, or review provider unless the user authorized that external change. Report a missing optional adapter and continue with a safe fallback when possible.

## Worktree adapters

- When ChatGPT/Codex, Claude Code, Cursor, or another harness already assigned an isolated worktree, keep its branch and path. Verify them; do not create nested worktrees.
- A harness-created branch in a shared checkout is not equivalent to filesystem isolation unless the harness documents it or the user authorizes single-checkout mode.
- Without managed isolation, fetch the authorized base, check open changes for overlapping files, create a unique branch and distinct gitignored worktree, install dependencies there, and verify the current path and branch before editing.
- Keep the worktree until the PR is merged or closed. Cleanup requires confirming disposition and that no unique uncommitted work remains.

## Evidence recorder adapters

Before recording, determine whether the environment has native computer control, an accessible GUI, or only a headless browser. Verify the recorder rather than assuming it works.

When a compatible `evidence.py` is present, locate it from the installed companion skill and run its `doctor` command. Require its reported encoding and capture prerequisites before using `start`, `annotate`, or `stop`. Use the companion's exact syntax; do not fabricate flags.

For an annotated live session:

1. Prepare a clean window and approved test account before capture.
2. Stamp the exact branch, revision or deployment, environment, and test target.
3. Record a setup note, then a test-start note for each flow.
4. Drive the real application at a watchable pace.
5. Record one concise `passed`, `failed`, or `untested` assertion per meaningful state change.
6. Stop and finalize the recorder normally.
7. Inspect frames at the important assertions and verify the shared artifact opens.

Never use a synthetic source as evidence of a real UI test. If the recorder fails, preserve any valid raw capture and use ordered screenshots plus `assertions.md`; do not claim a missing final video exists.

For headless environments, use repository-native end-to-end tests, a one-off scriptable-browser capture, ordered screenshots, or a recorded browser flow. Keep the script beside the evidence when reproducibility benefits. Do not add a new project dependency solely for capture without authorization.

## Before-and-after adapter

Use the exact package `@vercel/before-and-after` when that tool is selected; do not substitute a similarly named package. Prefer existing baseline/final images when they already prove the same state.

Before capture:

- establish the real baseline URL or image instead of assuming it;
- keep viewport, selector, data, auth state, and capture area equivalent;
- use mobile, tablet, custom-size, or full-page modes only when required by the PRD;
- check whether preview protection blocks automated capture;
- decide where artifacts may be uploaded.

Treat the tool's default public upload endpoint as public. Never upload sensitive or private captures there. Installing the package, obtaining a protection bypass, uploading artifacts, or editing a PR are separate external actions requiring authorization. If upload is not allowed, return local evidence and PR-ready Markdown placeholders.

## VCS and review adapters

Detect the repository's actual platform and configured tools. Support GitHub PRs, GitLab MRs, or Perforce shelved changes only when the relevant authenticated integration exists. Never switch to or modify a review branch that is not the task's authorized branch/workspace.

For Greptile:

- use the normal configured trigger first, commonly `@greptile review`;
- if Greptile reports that the change exceeds its file-count limit and the repository supports the alternate integration, trigger `@greptile-apps review`;
- if the large-change path creates no current-head check, poll the newest Greptile-authored summary by `updated_at` and require an update after the trigger;
- parse both the newest summary, including its actionable-fix section, and unresolved inline threads;
- require `5/5` and zero unresolved actionable comments only when that is the configured gate;
- keep the factory default at five iterations unless the user or repository explicitly chooses another cap;
- stop on timeout, stale results, conflicting advice, material scope expansion, or a human decision.

An automated score never replaces tests, security review, product acceptance, or human merge approval.

## Source provenance

These adapters incorporate workflow patterns from [michaelshimeles/skills](https://github.com/michaelshimeles/skills): `new-feature`, `code-structure`, `evidence-driven-testing`, `before-and-after`, `greploop`, and `greploop-apps`. The factory paraphrases their operating concepts and integrates them with its own approval and safety gates; it does not bundle their third-party executables.
