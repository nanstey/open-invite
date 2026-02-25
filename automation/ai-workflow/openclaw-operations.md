# OpenClaw Operations for AI Workflow

This document explains how OpenClaw schedules and runs the Open Invite AI workflow.

## 1) Components and Responsibilities

- `automation/ai-workflow/policy.md`
  - Behavioral source of truth (rules, transitions, escalation, retry policy).
- `automation/ai-workflow/cycle-checklist.md`
  - Deterministic per-cycle run procedure.
- `automation/ai-workflow/status-event-map.md`
  - Event -> status transition contract for coordinator logic.
- `scripts/ai-dev-workflow/change-detection-loop.mjs`
  - Change detector entrypoint for each cycle.
- `scripts/ai-dev-workflow/lib/github-comment-safe.sh`
  - Safe PR comment helper (`gh ... --body-file`).

## 2) Recommended OpenClaw Job Model

Use an **isolated agentTurn cron job** every 30 minutes.

Why isolated:
- Keeps automation state and execution context separate from main chat.
- Reduces conversational noise and accidental prompt drift.
- Better fit for deterministic, recurring execution.

### Session target
- `sessionTarget = "isolated"`
- `payload.kind = "agentTurn"`

### Cadence
- 30-minute interval.

## 3) Execution Flow Per Cycle

1. Cron triggers isolated agent turn.
2. Agent runs change detector:
   - `node scripts/ai-dev-workflow/change-detection-loop.mjs`
   - (or `pnpm ai-workflow:loop` if environment supports it)
3. If no changes are detected:
   - Exit quietly (no alert).
4. If changes are detected:
   - Execute using `automation/ai-workflow/cycle-checklist.md`
   - Apply policy from `automation/ai-workflow/policy.md`
   - Use transition semantics from `automation/ai-workflow/status-event-map.md`
5. Post PR updates safely via body-file pattern.
6. Resolve addressed threads (or post permission fallback message).
7. Persist checkpoint state atomically.
8. Notify Noel only for errors or explicit decisions needed.

## 4) Environment and Runtime Inputs

Required/expected variables:

- `OPEN_INVITE_ON_DECK_CMD` (optional in bootstrap)
  - Shell command that returns JSON project snapshots.
- `GH_REPO` (recommended)
  - Example: `nanstey/open-invite`
- `AI_DEV_WORKFLOW_STATE_PATH` (recommended)
  - Durable checkpoint path.

Future production wiring (TODO):
- Non-interactive GitHub auth strategy for automation identity.
- Project polling credentials for production-safe data access.
- Alerting route (Telegram/OpenClaw messaging) for exception-only notifications.

## 5) Checkpointing and Anti-Loop Rules

Checkpoint key should be per `(project_id, pr_number)` and include:
- `last_processed_comment_ts`
- `last_processed_review_ts`
- `processed_comment_ids[]`
- `processed_thread_ids[]`
- `last_batch_commit_sha`

Anti-loop requirement:
- New development work may trigger only from comments that are:
  1) unresolved,
  2) newer than checkpoint, and
  3) not already present in processed id ledger.

## 6) Example OpenClaw Cron Intent (Conceptual)

- Trigger every 30 minutes.
- In isolated session, run:
  - Detect changes
  - If changed, execute checklist/policy flow
  - Emit concise exception-only notifications

(Concrete cron payload can be generated per environment once credentials/runtime paths are finalized.)

## 7) Operational Guardrails

- Noel is sole merge authority.
- Clippy does not perform direct repo coding actions unless explicitly delegated through approved workflow.
- Proposal docs may drift from final implementation; automation follows this folder's operational policy/contracts.
