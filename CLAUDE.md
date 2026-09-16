@AGENTS.md

## Claude Code notes

- Project skills live in `.claude/skills/`. Use `software-factory` for PRD refinement and PRD-to-PR delivery, `architectural-guardrails` for guardrail design, feature work through the guarded path, and audits.
- Permission posture: normal mode with explicit allow rules; no unrestricted bypass. Never read or commit `.env` / `.env.local` / any other `.env*` file that can hold secrets; the only exception is the committed, secret-free template `.env.example`.
- In Claude Code web sessions the assigned branch is the isolation boundary (single-checkout mode is authorized there). Locally, use a worktree.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before claiming a change is verified; `npm run e2e` needs a prior build. Never report a skipped check as passed.
