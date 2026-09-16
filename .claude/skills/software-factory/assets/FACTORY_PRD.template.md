# Factory-Ready PRD: [Title]

**Source:** [original title, file, issue, or message]
**Revision:** [version/date]
**Readiness:** [READY | READY WITH ASSUMPTIONS | BLOCKED]
**Approval:** [pending | approved by/when | auto-proceed authorized]

## 1. Executive summary

[Problem, target user, desired outcome, and why now in two to four sentences.]

## 2. Source facts and evidence

- **Supplied facts:** [facts stated by the user or source]
- **Repository evidence:** [relevant current behavior, architecture, or constraints actually inspected]
- **Unknowns:** [important things not established]

## 3. Goals and success measures

| ID | Goal or measure | Target | How measured |
|---|---|---|---|
| G-001 | [outcome] | [threshold or observable result] | [source of measurement] |

## 4. Non-goals

- [Explicitly excluded behavior or surface]

## 5. Users, permissions, and use cases

| Actor | Need | Entry point | Permission or constraint |
|---|---|---|---|
| [actor] | [job to be done] | [surface] | [access rule] |

## 6. User and system flows

### Primary flow

1. [Trigger]
2. [System/user behavior]
3. [Observable outcome]

### Alternate and failure flows

- [Invalid input, empty state, denial, timeout, retry, partial failure, or recovery behavior]

## 7. Functional requirements

| ID | Requirement | Priority | Source | Notes |
|---|---|---|---|---|
| FR-001 | The system shall [observable behavior]. | Must | [source fact/approved decision] | [edge conditions] |

## 8. Experience requirements

- **Loading:** [behavior or not applicable]
- **Empty:** [behavior or not applicable]
- **Success:** [behavior]
- **Error and recovery:** [behavior]
- **Permission denied:** [behavior or not applicable]
- **Accessibility:** [keyboard, screen reader, contrast, motion, or not applicable]
- **Responsive/platform behavior:** [desktop/mobile/client constraints]

## 9. Data, interfaces, and compatibility

- **Data ownership and lifecycle:** [model, retention, deletion, privacy]
- **API/events/contracts:** [inputs, outputs, errors, versioning]
- **Migration/backfill:** [strategy or not applicable]
- **Backward compatibility:** [requirements]

## 10. Quality requirements

| ID | Category | Requirement or threshold | Verification |
|---|---|---|---|
| NFR-001 | [security/performance/reliability/privacy/observability] | [measurable requirement] | [check] |

## 11. Dependencies and constraints

- **Dependencies:** [systems, teams, approvals, credentials]
- **Fixed constraints:** [platform, deadline, budget, policy]
- **Implementation preferences:** [nonbinding suggestions, clearly labeled]

## 12. Acceptance criteria and evidence

| ID | Requirement links | Observable acceptance criterion | Planned check | Runtime evidence |
|---|---|---|---|---|
| AC-001 | FR-001 | Given [state], when [action], then [result]. | [test/command] | [capture/probe/measurement] |

## 13. Delivery slices

| Slice | Scope | Requirement links | Depends on | Reviewable outcome |
|---|---|---|---|---|
| S-1 | [small coherent change] | FR-001, AC-001 | [none] | [demonstrable result] |

## 14. Rollout, rollback, and observability

- **Rollout:** [flag, staged release, migration order, or direct release]
- **Rollback:** [safe reversal and data considerations]
- **Analytics/telemetry:** [events and success indicators]
- **Operational monitoring:** [logs, metrics, alerts, dashboards]

## 15. Risks, assumptions, and decisions

### Risks

| Risk | Likelihood/impact | Mitigation | Owner or gate |
|---|---|---|---|
| [risk] | [rating] | [mitigation] | [owner/approval] |

### Assumptions

- `A-001` — [reversible assumption and how to change it]

### Decisions needed

- `D-001` — [question, options, impact, and decision owner]

## 16. Definition of done

- All approved `Must` requirements are implemented.
- Every acceptance criterion has pass/fail/untested status with evidence.
- Required checks pass on the exact delivered revision.
- Security, privacy, migration, and accessibility gates are satisfied or explicitly waived by an authorized human.
- Rollout and rollback are documented for the affected risk level.
- Merge and deployment remain human-controlled unless separately authorized.

## Changes from source

- **Clarified:** [ambiguous wording made testable]
- **Added:** [missing requirement or delivery detail]
- **Excluded:** [scope removed or made non-goal]
- **Unresolved:** [decision still needed]
