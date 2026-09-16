# WhiteboardAssistant

An AI whiteboarding SaaS: Next.js + Excalidraw canvas with a CopilotKit agent that can see and edit the board, inspired by TubeGuruji's "AI Agentic Whiteboard" tutorial, with a planned FluidVoice (voice dictation) integration.

**Status:** planning; no application code yet.

| Document | Purpose |
|---|---|
| [PLAN.md](./PLAN.md) | Architecture, verified stack versions, agent/tool design, delivery workflow, FluidVoice path |
| [docs/prds/0001-ai-whiteboard-mvp.md](./docs/prds/0001-ai-whiteboard-mvp.md) | Factory-ready PRD: requirements, acceptance criteria, slices, assumptions, decisions needed |
| [docs/architecture/GUARDRAIL_MAP.md](./docs/architecture/GUARDRAIL_MAP.md) | Trust boundaries, entry-point inventory, enforcement layers, verification matrix |
| [AGENTS.md](./AGENTS.md) | Operating contract for agents and contributors (`CLAUDE.md` imports it) |
| `.claude/skills/` | Checked-in `software-factory` and `architectural-guardrails` skills |
