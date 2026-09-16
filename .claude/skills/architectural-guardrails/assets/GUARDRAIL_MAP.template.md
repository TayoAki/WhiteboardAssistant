# Guardrail Map

## Scope

- Repository/subsystem:
- Mode: assess | design | retrofit | feature | audit | PRD hardening
- Requested outcome:
- Mutation authority:
- Relevant versions/environment:

## Trust boundaries and authorities

| Concern | Authority/source of truth | Trusted inputs | Untrusted inputs | Enforcement point | Deny/failure behavior |
|---|---|---|---|---|---|
| Identity | | | | | |
| Tenant/membership | | | | | |
| Object access | | | | | |
| Roles/actions | | | | | |
| Plan/quota | | | | | |
| Runtime input | | | | | |
| Rate/cost | | | | | |
| Audit | | | | | |

## Entry-point inventory

| Entry point | Caller | Verified context source | Canonical boundary | Data/side effect | Coverage status | Evidence |
|---|---|---|---|---|---|---|
| | | | | | blocked / exception / unverified / gap | |

## Static and runtime guardrails

| Invariant | Guidance | Static check | Runtime check | Test/CI evidence | Known bypass |
|---|---|---|---|---|---|
| | | | | | |

## Verification matrix

| Case | Expected result | Layer exercised | Command/test | Result |
|---|---|---|---|---|
| Allowed happy path | | | | |
| Unauthenticated | | | | |
| Wrong action/role | | | | |
| Cross-tenant | | | | |
| Wrong object | | | | |
| Invalid/oversized input | | | | |
| Repeated/concurrent | | | | |
| Alternate entry point | | | | |
| Audit redaction | | | | |

## Exceptions and residual risks

| Gap/exception | Impact | Compensating control | Owner | Expiry/review date | Status |
|---|---|---|---|---|---|
| | | | | | |

## Next bounded action

- Smallest enforcement improvement:
- Proof required:
- Explicitly out of scope:
