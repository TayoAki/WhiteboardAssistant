# Rewrite a PRD for factory execution

Use this procedure before implementation whenever the source is a PRD, product brief, issue, transcript, or loosely scoped idea. The rewrite is a product clarification artifact, not permission to code.

## Contents

1. Preserve and classify the source
2. Diagnose execution gaps
3. Resolve only material ambiguity
4. Write the factory-ready PRD
5. Score readiness and obtain approval
6. Hand off to execution

## 1. Preserve and classify the source

Do not overwrite the source unless the user explicitly asks. Record its title or identifier and distinguish:

- **Supplied fact:** stated directly in the source or by the user;
- **Repository evidence:** observed in code, tests, configuration, or documentation;
- **Assumption:** reversible interpretation proposed to keep the work moving;
- **Recommendation:** a suggested product or technical choice awaiting acceptance;
- **Decision needed:** ambiguity whose resolution materially changes the result.

Summarize the requested outcome in one or two sentences. If that summary cannot be written without guessing, ask a focused question before drafting details.

## 2. Diagnose execution gaps

Assess the source against this gate:

| Area | Factory-ready test |
|---|---|
| Problem and outcome | The current problem and intended user or business outcome are explicit. |
| Users and use cases | Actors, permissions, entry points, and primary flows are named. |
| Goals and non-goals | Included and excluded behavior is bounded. |
| Functional behavior | Inputs, outputs, rules, state changes, edge cases, and failure behavior are observable. |
| UX states | Loading, empty, success, error, permission, and recovery states are addressed when applicable. |
| Data and interfaces | Data ownership, API or event contracts, migration, retention, and compatibility are addressed when applicable. |
| Quality attributes | Security, privacy, accessibility, reliability, performance, and observability have relevant thresholds or explicit exclusions. |
| Dependencies and constraints | Systems, teams, deadlines, platforms, budgets, and fixed technical choices are separated from preferences. |
| Acceptance | Each criterion can be demonstrated or tested without interpreting intent. |
| Delivery | Evidence, rollout, rollback, risks, and unresolved decisions are explicit. |

Call out only gaps that affect implementation, validation, safety, or release. Do not bloat a small change with irrelevant sections.

## 3. Resolve only material ambiguity

Ask at most three short, high-leverage questions at a time. Ask when the answer changes product behavior, data, permissions, architecture, cost, schedule, compliance, or release risk. Offer concrete mutually exclusive choices when that makes the tradeoff easier to answer.

Do not block on low-impact details that are reversible and consistent with the source. Instead, label the assumption and explain how to change it. Never present an assumption as a fact.

If interaction is unavailable, keep material questions in `Decisions needed` and mark the PRD `BLOCKED`. Do not implement the affected scope.

## 4. Write the factory-ready PRD

Use [../assets/FACTORY_PRD.template.md](../assets/FACTORY_PRD.template.md). Apply proportional detail and these rules:

- Give functional requirements stable IDs such as `FR-001` and quality requirements IDs such as `NFR-001`.
- Give acceptance criteria stable IDs such as `AC-001`; write them as Given/When/Then or another directly observable statement.
- Link every acceptance criterion to one or more requirements and a planned check or runtime evidence item.
- Make negative behavior explicit: forbidden actions, permission failures, invalid input, retries, timeouts, empty states, and partial failure where relevant.
- Separate product behavior from implementation suggestions. Repository architecture can constrain implementation but should not silently redefine the product.
- Split large work into ordered, independently reviewable slices. State dependencies and which criteria each slice satisfies.
- Include migration, rollout, rollback, analytics, observability, security, privacy, and accessibility only to the degree the affected surface requires.
- Include a concise `Changes from source` section so the user can see what was clarified, added, excluded, or left unresolved.

Keep unknown values as `TBD — decision needed`, not invented specificity.

## 5. Score readiness and obtain approval

Finish the PRD package with one readiness status line, selecting exactly one value:

- **READY:** all material product and delivery decisions are resolved and acceptance is testable.
- **READY WITH ASSUMPTIONS:** only explicit, low-impact, reversible assumptions remain.
- **BLOCKED:** at least one unresolved decision could materially change implementation, safety, cost, or release behavior.

Return:

1. a short gap summary;
2. the rewritten factory-ready PRD;
3. changes from the source;
4. assumptions and decisions needed;
5. readiness status and the exact next approval action.

For `BLOCKED`, ask the user to resolve the listed decisions; revise the PRD before requesting approval. For either ready status, ask the user to approve or amend the rewritten PRD. Auto-proceed only when the user explicitly requested it and status is not `BLOCKED`. Approval applies to the identified PRD revision; material later changes require a new approval note.

## 6. Hand off to execution

In **Refine PRD** mode, stop after the approval handoff. In **Run** mode, after approval:

1. derive the compact task contract from the PRD;
2. preserve requirement and acceptance IDs in the plan, code-change summary, tests, evidence, and PR description;
3. order implementation slices by dependency and risk;
4. carry every assumption, exclusion, and stop condition into preflight;
5. return to PRD intake if repository evidence invalidates a material requirement.

Never treat a rewritten PRD as proof that the product decision is correct. It makes intent explicit and testable; the user remains the decision-maker.
