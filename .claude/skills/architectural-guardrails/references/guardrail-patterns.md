# Guardrail patterns

Use these patterns as design options. Adopt only what the repository needs and already supports.

## Guardrail hierarchy

| Layer | Best for | Not sufficient for |
|---|---|---|
| Instructions and comments | discovery, conventions, architectural intent | deterministic enforcement |
| Types and generated contracts | compile-time shape and exhaustive keys | hostile runtime input, authorization |
| Lint/dependency rules | forbidden imports, layer crossings, required wrappers | dynamic/runtime behavior, non-code callers |
| Runtime schemas | input shape, bounds, normalization | identity, ownership, business permission |
| Policy/service boundary | action, tenant, object, plan, business rules | paths that bypass it |
| Database constraints/RLS | integrity and tenant defense in depth | all application semantics, external side effects |
| Tests | known positive/negative/regression cases | exhaustive proof |
| Hooks and CI | early feedback and merge gates | trusted configuration, production runtime policy |
| Monitoring/audit | detection, investigation, accountability | preventive control by itself |

Use more than one layer for high-impact invariants.

## Guarded mutation contract

A useful framework-neutral contract is:

```ts
type GuardedCommand<I, O> = (request: {
  principal: VerifiedPrincipal;
  tenant: VerifiedTenant;
  input: I;
  correlationId: string;
}) => Promise<O>;
```

The entry adapter should verify request identity and parse transport input. The canonical command/service should make target-specific authorization decisions, enforce domain rules, and call scoped data access. The adapter returns a minimal transport result.

Do not allow callers to construct `VerifiedPrincipal` or `VerifiedTenant` from untrusted fields. Use opaque constructors, private modules, or factories where the language permits.

## Policy registry

Use small, typed registries for truly canonical facts such as resource/action names, plan capabilities and hard limits, feature rollout metadata, audit event names and redaction classes, or navigation labels that intentionally mirror a policy.

Keep evaluation functions pure when practical. Separate policy declaration from infrastructure effects. Do not put dynamic membership, object ownership, secrets, or database facts into a client-shared registry.

## Tenant boundary

1. authenticate the principal;
2. accept a tenant selector only as a hint;
3. resolve current membership/authorization server-side;
4. produce an immutable verified tenant context;
5. scope every tenant-owned query and cache key;
6. use database policy/constraints where appropriate;
7. test cross-tenant reads, writes, batch operations, exports, background jobs, and stale membership.

Never trust a client-provided `tenantId` merely because it typechecks or appears in a signed-in request.

## Entry adapters

Treat each adapter as an exposed caller: REST/API route, RPC/GraphQL resolver, Server Action, webhook, queue worker or scheduled job, CLI/admin task, and internal service-to-service endpoint.

Each adapter must either obtain verified context and invoke the canonical boundary, or document an explicit alternative control. A page/layout check does not protect a nested Server Action. A webhook signature authenticates the sender, not necessarily authorization for every target object.

## Static enforcement

Good project-specific lint/dependency rules include:

- database client imports allowed only in the data-access layer;
- direct vendor identity types forbidden outside the adapter;
- bare/public procedure constructors forbidden in protected modules;
- server-only modules marked and excluded from client graphs;
- policy keys imported from the canonical registry instead of string literals;
- disable comments require a reason, owner, and expiry.

Unit-test custom rules and run them in CI. Treat them as incomplete if aliases, generated code, alternative languages, or runtime construction can bypass syntax matching.

## Rate and resource budgets

Model the scarce unit, not only requests:

| Dimension | Example control |
|---|---|
| principal/client | attempts per time window |
| tenant | shared capacity or plan quota |
| operation | stricter reset/export/AI-generation limit |
| payload | maximum upload/string/array size |
| batch/pagination | operations or records per request |
| execution | timeout, CPU/memory/concurrency bound |
| downstream spend | provider hard cap, reservation, billing alert |

Specify storage/coordination for distributed deployments, trusted proxy handling, fail-open/fail-closed behavior, retry semantics, and whether budget reservation must be atomic.

## Audit event contract

Prefer explicit event names and structured fields:

```ts
type AuditEvent = {
  event: string;
  occurredAt: string;
  correlationId: string;
  actorId: string;
  tenantId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  outcome: "success" | "denied" | "failed";
  reasonCode?: string;
  metadata?: Record<string, string | number | boolean>;
};
```

Do not log passwords, access tokens, keys, connection strings, raw request bodies, or sensitive personal/business data by default. Sanitize untrusted strings against log injection. Define retention, access controls, integrity/tamper detection, monitoring, and failure behavior.

## Vendor adapter

Expose stable domain concepts, not the provider's entire object:

```ts
interface IdentityPort {
  currentPrincipal(request: RequestLike): Promise<VerifiedPrincipal | null>;
  memberships(principalId: string): Promise<ReadonlyArray<Membership>>;
}
```

Keep vendor-specific mapping, error translation, and webhook verification inside the adapter. Test the domain port separately. Record features that cannot be represented portably rather than hiding them.

## Verification matrix

For every guarded operation, include:

- valid principal + permitted object succeeds;
- missing/invalid principal fails;
- wrong role/action fails;
- wrong tenant fails;
- right tenant but wrong object fails;
- invalid and oversized input fails before side effects;
- repeated/concurrent call respects idempotency and budget;
- downstream failure has defined rollback/audit behavior;
- alternate entry points enforce equivalent policy;
- logs contain required fields and exclude secrets.
