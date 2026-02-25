# AI Workflow Autonomy Guardrails

This document defines hard guardrails for autonomous execution.

## 1) Autonomy Budgets (per cycle)
- Max runtime per cycle: 20 minutes
- Max autonomous commits per cycle: 2
- Max remediation retries per failing step: 2
- Max PR comments posted by automation per cycle: 2 (1 summary + 1 exception rationale block)

If any budget is exceeded:
- stop autonomous mutation for the cycle
- emit escalation summary
- require human follow-up

## 2) Confidence Gates
- High confidence: proceed autonomously.
- Medium confidence: proceed only if change is reversible and scoped.
- Low confidence: no mutation; post proposed plan and request decision.

Low-confidence examples:
- ambiguous product intent
- conflicting reviewer guidance
- failures with unclear root cause after 2 retries

## 3) Protected Areas (default no-touch)
Without explicit approval, do not autonomously mutate:
- deployment credentials / secret wiring
- production environment settings
- auth policy broadening (RLS/security scope expansion)
- billing/payment-critical logic
- historical migration files (older timestamped migrations) via in-place edits

## 4) Rollback Contract
Every autonomous mutation must be:
- small and atomic (single concern)
- clearly labeled in commit message (`fix(ci): ...`, `chore(ai): ...`)
- reversible without cross-branch side effects

## 4.1 Test Addition Policy
- Running tests is mandatory; adding/updating tests is required when behavior changes.
- If behavior changed and no test was added, PR summary must include explicit rationale.
- CI-remediation-only formatting/lint fixes may skip new tests when no behavior changed.

## 4.2 Self Review Gate (before push)
- Validate diff scope matches intended change.
- Check for accidental unrelated edits.
- Verify edge cases for touched logic paths.
- For DB/auth changes: verify migration/seed implications and rollback safety.
- Ensure PR summary includes what changed, what was tested, and any deferred risks.

## 4.3 Refactor Scope Limits
- Opportunistic refactors are allowed only in touched files/modules and must reduce risk/readability debt.
- Cross-cutting refactors require explicit approval or a separate refactor PR.
- Do not mix broad refactor + behavior change in one autonomous batch unless explicitly requested.

## 5) Locking + State Durability
- Per-branch lock is required before mutation.
- Lock must be released in `finally` paths.
- Checkpoint writes are atomic.
- If lock/checkpoint integrity is uncertain, stop and escalate.

## 6) Escalation Ladder
On repeated failure (same branch/problem >2 cycles):
1. stop mutation
2. collect minimal diagnostics + failing artifacts
3. post concise escalation (root-cause hypothesis + 1-2 recovery options)
4. wait for human decision

## 7) Human Override Controls
Support these control modes:
- `PAUSE_AUTONOMY=1` (observe only)
- `NO_COMMIT_MODE=1` (analyze/test, no push)
- `REVIEW_ONLY_MODE=1` (summarize findings, no code changes)

## 8) Branch Hygiene
- One active autonomous runner per branch.
- Stale branch lock detection/recovery required.
- Branches with no updates for policy timeout should be flagged for archive/close review.

## 9) Notification Discipline
- No no-op spam.
- Notify on: errors, exceeded budgets, decision-needed states, or blocked_review transitions.
- Batch updates into concise summaries.
