@AGENTS.md

## Claude Code notes

- Project skills live in `.claude/skills/`. Use `software-factory` for PRD refinement and PRD-to-PR delivery, `architectural-guardrails` for guardrail design, feature work through the guarded path, and audits.
- Permission posture: normal mode with explicit allow rules; no unrestricted bypass. Do not read or commit `.env*` files.
- In Claude Code web sessions the assigned branch is the isolation boundary (single-checkout mode is authorized there). Locally, use a worktree.
- The repository has no runnable commands yet; do not claim lint, tests, or build were run until S-1 lands.
