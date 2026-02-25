# OpenClaw Operations for AI Workflow

This document explains how OpenClaw schedules and runs the Open Invite AI workflow.

## 1) Components and Responsibilities

- `automation/ai-workflow/policy.md`
  - Behavioral source of truth (rules, transitions, escalation, retry policy).
- `automation/ai-workflow/cycle-checklist.md`
  - Deterministic per-cycle run procedure.
- `automation/ai-workflow/status-event-map.md`
  - Event -> status transition contract for coordinator logic.
- `automation/ai-workflow/autonomy-guardrails.md`
  - Hard autonomy limits, escalation ladder, and override controls.
- `automation/ai-workflow/scripts/change-detection-loop.mjs`
  - Change detector entrypoint for each cycle.
- `automation/ai-workflow/scripts/lib/github-comment-safe.sh`
  - Safe PR comment helper (`gh ... --body-file`).

## 2) Recommended OpenClaw Job Model

Use isolated agentTurn cron jobs every 30 minutes, with branch-level isolation.

Why isolated:
- Keeps automation state and execution context separate from main chat.
- Reduces conversational noise and accidental prompt drift.
- Better fit for deterministic, recurring execution.

### Session target
- `sessionTarget = "isolated"`
- `payload.kind = "agentTurn"`

### Cadence
- 30-minute interval.

### Multi-branch operating mode (recommended)
- One cron job/runner context per active branch.
- Each branch runs in its own git worktree directory.
- Enforce per-branch lock so only one run can mutate a branch at a time.
- Keep promotion/merge-readiness checks serialized (single promotion lane).

Example worktree setup:
```bash
automation/ai-workflow/scripts/setup-worktree.sh ci/ai-dev-workflow
automation/ai-workflow/scripts/setup-worktree.sh feat/groups ../wt-feat-groups
```
Run one loop instance per worktree path.

## 3) Execution Flow Per Cycle

1. Cron triggers isolated agent turn.
2. Agent runs change detector:
   - `node automation/ai-workflow/scripts/change-detection-loop.mjs`
   - (or `pnpm ai-workflow:loop` if environment supports it)
   - detector includes on-deck project changes, new PR comment/review activity, and newly failed GitHub Actions runs.
3. If no changes are detected:
   - Exit quietly (no alert).
4. If changes are detected:
   - Execute using `automation/ai-workflow/cycle-checklist.md`
   - Apply policy from `automation/ai-workflow/policy.md`
   - Enforce limits from `automation/ai-workflow/autonomy-guardrails.md`
   - Use transition semantics from `automation/ai-workflow/status-event-map.md`
   - Use `automation/ai-workflow/supabase-local-runbook.md` for local DB-backed checks
   - Use `automation/ai-workflow/browser-validation-runbook.md` for agent browser validation
5. Ensure branch freshness before final gate checks (rebase onto `main` when behind; resolve conflicts in-branch).
6. Post PR updates safely via body-file pattern.
7. Resolve addressed threads (or post permission fallback message).
8. Persist checkpoint state atomically.
9. Notify Noel only for errors or explicit decisions needed.

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

Note: CI remediation has a built-in default (`automation/ai-workflow/scripts/ci-remediate.mjs`), so no extra wiring is required unless you want custom behavior.

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
- Do not run multi-branch mutation in a single checkout; use worktrees for parallelism.
- Keep `AI_DEV_WORKFLOW_AUTO_FIX_ALL_BRANCHES` off unless explicitly running controlled recovery.
