# AI Development Workflow — Per-Cycle Execution Checklist

Use this checklist on every 30-minute automation cycle to keep behavior deterministic.

## 0) Preflight
- [ ] Confirm execution identity is an Open Invite developer agent (not Clippy).
- [ ] Confirm autonomy mode flags (`PAUSE_AUTONOMY`, `NO_COMMIT_MODE`, `REVIEW_ONLY_MODE`) and apply most restrictive mode.
- [ ] Acquire branch lock for current branch (abort if lock already held).
- [ ] Confirm this run is pinned to a single branch/worktree context (no branch switching mid-run).
- [ ] Load last checkpoint state for this project/PR:
  - [ ] `last_processed_comment_ts`
  - [ ] `last_processed_review_ts`
  - [ ] `last_processed_thread_ids[]`
  - [ ] `last_processed_comment_ids[]`
- [ ] Abort with alert if checkpoint state cannot be read/write persisted.

## 1) Detect Work
- [ ] Query `feedback_projects` for `status = on_deck` changes since last cycle.
- [ ] Query tracked proposal/implementation PRs for new reviews/comments.
- [ ] Query recent GitHub Actions workflow runs and capture newly failed runs since last checkpoint.
- [ ] Build candidate comment set:
  - [ ] `created_at > last_processed_comment_ts`
  - [ ] thread is unresolved
  - [ ] comment/thread id not already in processed sets
- [ ] If no project changes, no candidate comments, and no newly failed workflow runs: exit silently (no notification).

## 2) Proposal Stage Handling (if applicable)
- [ ] If project is `on_deck`, run triage ranking and select candidate(s).
- [ ] Ensure proposal doc exists/updated in `docs/projects/{date}_{project}.md`.
- [ ] Ensure proposal PR exists and `links.proposal` is recorded.
- [ ] If proposal moved to waiting review, sync project status to `review`.

## 3) Implementation Stage Handling (if applicable)
- [ ] If proposal merged, immediately start implementation branch/PR.
- [ ] Ensure only one active implementation branch per project.
- [ ] Ensure implementation PR includes required `Proposal Ref:`.
- [ ] Sync status to `in_progress` when implementation starts/resumes.

## 4) PR Comment Intake and Classification (Batch)
For each candidate unresolved comment:
- [ ] Record author/login, thread id, comment id, timestamp, file/line context.
- [ ] If author is `chatgpt-codex-connector`:
  - [ ] Evaluate validity:
    - [ ] Correctness: claim is technically accurate.
    - [ ] Scope: relevant to this PR/proposal.
    - [ ] Actionability: concrete and testable.
    - [ ] Policy fit: consistent with approved proposal and constraints.
  - [ ] If valid, mark **Address**.
  - [ ] If invalid, mark **Defer** and prepare rationale comment.
- [ ] If author is Noel (or other human reviewer), mark **Address** unless explicitly out-of-scope; if out-of-scope, prepare rationale comment.

## 5) Execute One Batch
- [ ] Build a single consolidated plan: Address / Defer / Need-clarification.
- [ ] Check autonomy budget limits from `automation/ai-workflow/autonomy-guardrails.md` before mutating.
- [ ] For newly failed GitHub Actions runs, include a failure-response plan (root cause, impacted paths, remediation change).
- [ ] For backend/integration-sensitive changes, follow `automation/ai-workflow/supabase-local-runbook.md` before final validation.
- [ ] For UI-facing changes, follow `automation/ai-workflow/browser-validation-runbook.md` and capture concise evidence.
- [ ] Apply all code/doc changes in one batch.
- [ ] Run required checks:
  - [ ] lint
  - [ ] typecheck
  - [ ] tests
  - [ ] Playwright (if critical paths impacted)
  - [ ] visual artifact snapshots (30-day retention)
- [ ] Push exactly one update commit set for this batch.

## 6) Comment Back + Thread Resolution
- [ ] Post one summary PR comment with:
  - [ ] Addressed items
  - [ ] Deferred items + rationale
  - [ ] Any clarification requests
- [ ] For each deferred invalid `chatgpt-codex-connector` comment, post explicit in-thread explanation.
- [ ] Resolve all threads that were addressed in this batch.
- [ ] Do not resolve threads that still require reviewer input.

## 7) Persist Checkpoint (Critical Anti-Loop Step)
- [ ] Persist updated checkpoint atomically:
  - [ ] `last_processed_comment_ts = max(processed_comment_timestamps)`
  - [ ] `last_processed_review_ts = max(processed_review_timestamps)`
  - [ ] Append processed comment/thread ids
  - [ ] Store `last_batch_commit_sha`
- [ ] Persist decision ledger for audit:
  - [ ] comment_id
  - [ ] classification (address/defer)
  - [ ] rationale
  - [ ] resolved_at (if resolved)
- [ ] On persistence failure: raise error and stop loop (prevent duplicate reprocessing).

## 8) State Sync + Notifications
- [ ] Apply idempotent status transition event(s) with event log first.
- [ ] If sync fails after retries, mark `sync_error` and notify Noel.
- [ ] Notify Noel only on errors/exceptions or explicit decision needed.

## 9) Exit Criteria
- [ ] No unresolved, unprocessed comments remain in current scope.
- [ ] All addressed threads resolved.
- [ ] Checkpoint + event log successfully written.
- [ ] Branch lock released.
- [ ] Loop exits cleanly.

---

## Quick PR Comment Decision Matrix
- **Address now:** valid, in-scope, actionable.
- **Defer with explanation:** invalid, out-of-scope for this PR, duplicate of already-addressed item, or conflicts with approved proposal.
- **Request clarification:** ambiguous intent or missing reproduction details.
