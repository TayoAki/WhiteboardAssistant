# Structure shared operational code

Use this guidance only when multiple product flows share the same operational mechanics or the repository already follows an orchestration/service boundary. Repository-native architecture remains the default.

## Apply the architecture gate

Use a shared capability when all of these are true:

1. Two or more callers perform substantially the same operational work, or the approved PRD introduces a second caller.
2. The shared portion can be described without product-specific policy.
3. Inputs, outputs, errors, and side effects can be explicit.
4. Extraction reduces divergent behavior rather than merely moving code.

Keep logic with its current flow when it is single-use, domain-specific, still changing rapidly, or would require a broad architectural migration outside the approved PRD.

## Separate policy from mechanics

| Orchestration or action layer | Reusable capability or service layer |
|---|---|
| Own why and when work happens | Own how a repeatable operation is performed |
| Enforce authorization and ownership | Interact with providers, SDKs, commands, or infrastructure |
| Control domain state transitions | Perform health checks and readiness probes |
| Classify failures for the product | Return structured success and failure data |
| Choose retries and user-visible recovery | Expose composable operations without product policy |

Do not let a shared service silently mutate domain state, read hidden globals, decide authorization, or swallow failures. Prefer explicit parameter objects and structured results consistent with the repository's language and conventions.

## Design capability-sized APIs

Prefer small operations that callers can compose. Avoid a single method that provisions, configures, starts, validates, persists state, and reports user-facing errors in one opaque call.

Before adding an abstraction, answer:

- Which current or approved callers use it?
- Which behavior is genuinely identical?
- Which decisions must remain caller-owned?
- What does success return?
- How are timeouts, partial failure, idempotency, and cleanup represented?
- How will each caller be verified after migration?

If those answers are unclear, keep the code local and record the possible extraction as follow-up work.

## Migrate incrementally

1. Characterize the existing behavior with tests or runtime evidence.
2. Identify only the repeated, non-domain block.
3. Extract one capability with explicit inputs and structured results.
4. Replace one caller and verify its behavior.
5. Replace the remaining approved callers one at a time.
6. Keep authorization, product state, error classification, and user messaging in their owning flows.
7. Run type, lint, focused, integration, and runtime checks required by the task contract.

Stop if migration requires unapproved callers, changes public behavior, or turns the service into a new domain owner.

## Reject these outcomes

- a god service that hides the entire workflow;
- a service that reaches into product data without an explicit contract;
- inconsistent argument and error shapes across sibling capabilities;
- an abstraction with only one speculative caller;
- a refactor whose scope cannot be traced to approved requirement IDs.
