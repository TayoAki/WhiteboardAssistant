# Collect runtime evidence

Evidence demonstrates the behavior on the exact revision under review. It complements deterministic checks; it never replaces them.

## Choose the evidence type

| Change | Preferred evidence |
|---|---|
| UI state or interaction | Before/after captures or recorded live flow |
| API behavior | Repeatable request script and sanitized response/output pair |
| Performance | Fixed workload, environment, samples, and before/after measurements |
| Bug fix | Reproduction before editing plus the same scenario after the fix |
| Rendering/canvas | Captured frames plus measurable diff or assertion |
| Agent/tool behavior | Relevant sanitized trace excerpt |
| Internal nonvisual logic | Focused failing/passing test plus broader checks |

## Capture protocol

1. Define each target as an observable statement.
2. Record the starting state and prerequisites.
3. Capture the failure or baseline before changing behavior when feasible.
4. Test the final revision through the actual user or system path.
5. Record one assertion per meaningful state change.
6. Label each assertion `passed`, `failed`, or `untested`; include the reason for `untested`.
7. Stamp the branch, commit, environment, browser/runtime, and timestamp into the report.
8. Inspect the evidence itself before sharing it.

For UI comparisons, keep viewport, route, authentication state, seed data, and capture area equivalent. Do not compare unrelated states or use synthetic footage as proof of live interaction.

For performance comparisons, keep workload, warmup, sample count, runtime, and hardware equivalent. Report raw values and variability rather than only percentages.

## Choose the capture adapter

Read `references/integrations.md` when a companion evidence skill, recorder, scriptable browser, or before/after CLI may be used.

- **Native computer control plus GUI:** record the live session when an approved, verified recorder exists. Add setup, test-start, and result annotations as the real interaction occurs.
- **GUI without native computer control:** use an authorized desktop driver and verify state before and after every action. Keep the recorder separate unless the driver provides a verified recording.
- **Headless:** use repository-native browser tests, repeatable scripted captures, or ordered screenshots with an assertion log.
- **No UI:** use requests, logs, traces, rendered outputs, or measured comparisons appropriate to the acceptance criterion.

For PR-ready UI pairs, use a compatible `before-and-after` skill or the exact `@vercel/before-and-after` package only when available or authorized. Establish the baseline explicitly; a single current URL does not identify the before state. Keep external uploads and PR edits separate from local capture authorization.

## Artifact layout

Store local captures in a gitignored task directory:

```text
.artifacts/<task>/
├── before.*
├── after.*
├── evidence.*
├── assertions.md
├── manifest.json
├── probe-output.txt
└── report.md
```

Create only the files relevant to the task. Keep capture scripts beside outputs when doing so makes the run reproducible.

Use this report shape:

```markdown
# Evidence: <task>

- Revision:
- Environment:
- Test target:

| Assertion | Result | Artifact |
|---|---|---|

## Deterministic checks

## Caveats and untested cases
```

## Privacy and integrity

- Never record or upload secrets, tokens, personal data, private customer content, payment information, or unrelated desktop windows.
- Treat an unspecified upload host as public. Obtain approval before sending private artifacts to an external host.
- Prefer redacted fixtures or a non-production test account.
- Do not crop away information necessary to interpret a result.
- Do not stitch, simulate, or replay a flow and present it as a live test.
- Do not claim evidence is attached until the reviewer-accessible artifact opens successfully.

## Fallbacks

- No GUI: use scripted browser captures or a headless video.
- No recorder: use ordered screenshots with assertions.
- Protected preview: obtain an approved bypass mechanism or keep evidence private; do not disable protection without authorization.
- Missing prerequisite: mark the target `untested`, state the blocker, and provide the exact next step.
