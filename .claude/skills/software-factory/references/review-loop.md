# Run a bounded review-feedback loop

Use this loop only when the user authorized the PR/MR interaction and the repository has a configured review provider. A reviewer score is a routing signal, not proof of correctness, security, or product fit.

## Establish the gate

Before triggering review, determine:

- VCS and authenticated adapter: GitHub, GitLab, Perforce, or repository-native;
- provider and trigger method;
- current PR/MR and head commit;
- required score or conclusion;
- unresolved-thread requirement;
- required CI checks;
- maximum iterations, default five;
- timeout per review;
- escalation owner.

Do not invent a numeric gate when the provider does not expose one. Use its documented conclusion and unresolved findings instead.

## Loop

For each iteration:

1. Confirm the PR/MR head matches the final locally tested commit.
2. Trigger or wait for a review of that head. Avoid duplicate triggers while a review is running.
3. Stop on timeout rather than consuming stale results.
4. Fetch the newest summary and unresolved inline threads from the configured provider.
5. Reject results tied only to an older head unless the provider explicitly carries them forward.
6. Classify every finding:
   - actionable defect or missing test;
   - valid concern requiring user/product judgment;
   - informational suggestion;
   - false positive, with evidence.
7. Apply only justified changes. Do not distort code merely to increase a score.
8. Rerun affected checks and runtime verification.
9. Commit and push the iteration using the repository convention.
10. Resolve a thread only after the concern is addressed or a documented disposition is posted.
11. Exit when the review gate, unresolved-thread gate, and required CI checks all pass.

Stop immediately when:

- the iteration limit is reached;
- required credentials or provider access are unavailable;
- findings conflict with the task contract or one another;
- a proposed fix expands scope or risk materially;
- review results cannot be tied to the current head;
- a security, data, migration, or production decision requires human approval.

## Greptile adapter

When Greptile is the configured provider:

- use the repository's normal Greptile trigger, commonly `@greptile review`;
- use `@greptile-apps review` only when the normal path reports a file-count limit and the repository supports that integration;
- require the configured confidence target and zero unresolved actionable comments;
- verify the latest score belongs to the current head or was updated after the latest trigger;
- include actionable items from both inline threads and the newest summary comment.
- use the most recently **updated** Greptile-authored summary, because the provider may edit an existing comment instead of creating a new one;
- for the large-PR path, if no current-head check appears, accept only a summary update later than the alternate trigger and stop on timeout;
- support GitHub PR, GitLab MR, or Perforce review adapters only when the corresponding authenticated tool and review integration are actually configured.

Do not interpret `5/5` as a security certification. CI, specialized security checks, and human approval remain separate gates.

## Final report

Report:

```text
Provider:
Iterations:
Final head:
Review result:
Required CI:
Comments addressed:
Comments unresolved:
Stopped because:
Human decision required:
```

If the loop does not pass, list each unresolved issue with its file/surface, severity, and recommended next action. Never merge automatically at the end of the loop.
