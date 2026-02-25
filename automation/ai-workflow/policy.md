# RFC: AI-Driven Development Workflow (Feedback-Prioritized)

- **Date:** 2026-02-23
- **Status:** Proposed (final policy decisions incorporated)
- **Owner:** Noel (human approver/merger)
- **Scope:** `open-invite` repo workflow from customer feedback intake → proposal → implementation → PR review

## 1) Project Brief

Define a pragmatic, safe, repeatable AI-assisted delivery workflow that starts from production customer feedback data and moves work to shipped code with strong quality controls.

This RFC formalizes:
- how feedback gets prioritized,
- how proposals are generated and reviewed,
- how implementation proceeds after approval,
- how PR review comments are processed in **batch context**,
- and what standards/checks are required before merge.

## 2) Authoritative Project Status Model

`feedback_projects.status` is the single workflow state machine for both proposal and development phases.

- `backlog` = not ready, human defining scope
- `on_deck` = ready for agent to build proposal
- `in_progress` = agent has started work (proposal or development)
- `review` = waiting for human feedback (proposal PR or development PR)
- `completed` = merged

Notes:
- `archived` exists in current DB enum but is out-of-band for this workflow; operational automation ignores it.
- Noel is the only merge authority; agent never merges.

## 3) Stage Differentiation Within One Status Model

Because both proposal and implementation can be `in_progress`/`review`, stage is represented via required typed links.

### Recommended schema approach (generalized, migration-safe)

Use a generalized `links` object (or JSONB column) with typed entries, while requiring two canonical link types:
- `proposal` (required once proposal PR exists)
- `implementation` (required once implementation PR exists)

Example shape:

```json
{
  "links": {
    "proposal": {
      "url": "https://github.com/nanstey/open-invite/pull/123",
      "state": "open|approved|merged"
    },
    "implementation": {
      "url": "https://github.com/nanstey/open-invite/pull/456",
      "state": "open|changes_requested|approved|merged"
    }
  }
}
```

Why this approach:
- Supports current need (`proposal` + `implementation`) without future schema churn.
- Allows extra link types later (design docs, incident follow-ups, etc.).
- Keeps status enum stable while still distinguishing "in proposal" vs "in development."

Migration-safe path (finalized rollout):
1. Add nullable `links` field (JSONB) with default `{}`.
2. Backfill from existing known PR references where available.
3. Enforce **application-level validation first** in automation/API logic.
4. Defer optional DB-level constraints to a later hardening phase after rollout stabilization.

Operational interpretation:
- `status = in_progress` + `links.proposal` present + no `links.implementation` => proposal stage in progress.
- `status = review` + proposal PR open => proposal awaiting Noel feedback.
- `status = in_progress|review` + `links.implementation` present => development stage.

## 4) Synchronization Rules (Immediate + Consistent)

Status must update immediately on lifecycle events, with idempotent writes and single-writer control.

### 4.1 Event → status transition mapping

1. Project created but still being defined by human
   - event: `project_created`
   - transition: `-> backlog`

2. Human marks project ready for agent proposal work
   - event: `project_scoped_ready`
   - transition: `backlog -> on_deck`

3. Agent starts proposal work (first proposal branch/commit/PR creation)
   - event: `proposal_started`
   - transition: `on_deck -> in_progress`

4. Proposal PR opened or updated and waiting for Noel
   - event: `proposal_waiting_review`
   - transition: `in_progress -> review`

5. Noel requests proposal changes; agent resumes edits
   - event: `proposal_changes_requested`
   - transition: `review -> in_progress`

6. Proposal PR merged while project is in review
   - event: `proposal_approved`
   - transition: `review -> in_progress` by immediately initiating implementation branch/work.

7. Implementation branch created (triggered immediately after proposal merge)
   - event: `implementation_started`
   - transition: remains `in_progress` (idempotent confirmation of active development stage).

8. Implementation PR waiting for Noel feedback
   - event: `implementation_waiting_review`
   - transition: `in_progress -> review`

9. Noel requests changes on implementation PR
   - event: `implementation_changes_requested`
   - transition: `review -> in_progress`

10. Implementation batch push completed (address/defer summary posted, addressed-thread resolution attempted)
    - event: `implementation_batch_pushed`
    - transition: remains `in_progress` (idempotent progress confirmation)

11. Implementation PR moved to waiting review after batch completion
    - event: `implementation_rewaiting_review`
    - transition: `in_progress -> review`

12. Implementation PR merged by Noel
    - event: `implementation_merged`
    - transition: `review -> completed`

### 4.2 Consistency controls

- **Single-writer rule:** only Coordinator Agent service account writes project status.
- **Idempotent upserts:** each transition call includes `(project_id, event_id, target_status)` and is safe to replay.
- **Optimistic concurrency:** update with `where version = N`; increment version on success.
- **Event log first:** append event record before status mutation; persist `last_applied_event_id` on project row.

### 4.3 Rollback/error handling when sync fails

If status update fails after a workflow action (e.g., PR opened but DB write failed):
1. Mark automation run `error` with project ID + event ID + expected status.
2. Notify Noel **only on error/exception** (no no-change noise).
3. Retry with exponential backoff (idempotent event).
4. If retries exhaust, stop further transitions for that project (lock to `sync_error`) until manual retry/repair.
5. Reconciliation job on next 30-minute cycle compares GitHub state vs DB state and reapplies missing transition.

## 5) Workflow (End-to-End, Noel-aligned)

## Phase A: Intake + Prioritization

1. Query production feedback (`user_feedback`, `feedback_projects`, `feedback_project_items`).
2. **Triage only projects currently in `on_deck`.**
3. Rank with a simple score:
   - `priority_score = importance_weight + volume_weight + recency_weight + strategic_weight`
4. Link source feedback IDs.

Output: selected `on_deck` project candidate with evidence from feedback data.

## Phase B: Proposal Authoring (required before implementation)

For each selected `on_deck` project:
1. Read project description and relevant code paths.
2. Ask clarifying questions when requirements are ambiguous.
3. Produce/update proposal markdown in `docs/projects/{YYYY-MM-DD}_{project-name}.md`.
4. Open/update proposal PR and record `links.proposal`.

Required proposal sections:
- Project brief
- Assumptions
- Key features/outcomes
- High-level implementation
- Remaining open questions

Policy:
- **No implementation branch until proposal PR is approved.**

## Phase C: Review + Batch PR Comment Handling

### Branch freshness and conflict policy
- If implementation PR branch is behind `main`, rebase onto latest `main` before final validation.
- Resolve rebase conflicts in-branch and run validation checks again.
- If PR has high commit noise (many tiny commits), agent may squash branch commits before rebase to simplify conflict resolution and review context.
- After rebase/squash, force-push is allowed on the PR branch when required, with clear summary note.

1. Agent does not respond to comments one-by-one.
2. Agent collects all **new, unresolved** PR comments since last checkpoint.
3. For comments authored by `chatgpt-codex-connector` (bot), agent must evaluate validity:
   - If valid, treat exactly like Noel feedback and include it in the implementation batch.
   - If invalid/not-applicable, do not implement it; leave a thread reply explaining why it is not being addressed.
4. Agent synthesizes one update plan, applies changes in one batch, pushes once.
5. After push, resolve all review threads/comments that were addressed in that batch.
   - If the agent lacks permission to resolve a thread, it must post: "Addressed in commit <sha>; unable to mark resolved due to permissions" and continue.
6. Agent posts one summary comment (resolved/deferred/ready for re-review), including any bot-comment deferrals with rationale.
7. Comment dedupe rule: only trigger new development work from comments that are both (a) newer than `last_processed_comment_ts`, (b) still unresolved, and (c) not present in the processed `comment_id`/`thread_id` ledger; already-addressed threads must not trigger new loops.
8. Reviewer classes:
   - Human reviewer (Noel/approved humans): default Address unless out-of-scope.
   - Trusted bot reviewer (`chatgpt-codex-connector` initially): evaluate validity then Address/Defer.
   - Unknown bot reviewer: stricter validity threshold; default Defer with rationale unless clearly correct + actionable.

## Phase D: Implementation (immediately after proposal merge)

After proposal PR is merged:
1. Immediately create implementation branch and PR, set `links.implementation`.
2. Transition/confirm project status as `in_progress` when implementation starts.
3. PR template must include required field: **`Proposal Ref:`** linking approved proposal PR/doc.
4. Implement according to approved proposal; document any approved deltas.
5. Agent never merges; Noel merges.

Parallelism rule:
- **Maximum one active implementation branch per `on_deck` project.**

## 6) Automation Cadence and Notification Policy

30-minute automation loop:
1. Every 30 minutes, script checks for:
   - new/updated `on_deck` project signals,
   - new PR comments/reviews on tracked proposal/implementation PRs,
   - newly failed GitHub Actions runs since last checkpoint.
2. PR comment ingestion must ignore comments/threads already marked resolved or already included in prior batch checkpoints.
3. Execute cycle steps using `automation/ai-workflow/cycle-checklist.md`.
4. If no changes, do nothing (no noisy notification).
5. Spawn sub-agent work **only when changes are detected**.
   - Workflow failure handling: when a new failed CI run is detected, automatically generate and execute a remediation batch on the relevant working branch (or defer with explicit rationale if blocked).
6. Max retries per cycle for failing checks/actions: 2 retries per failing step, then mark deferred (`deferred_due_to_ci_failure`) and continue to summary.
7. Notify Noel only on errors/exceptions or when human decision is required.

### 6.1 Checkpoint Storage Contract (authoritative)
- Store cycle checkpoints in a durable single source of truth keyed by `(project_id, pr_number)`.
- Required fields:
  - `last_processed_comment_ts`
  - `last_processed_review_ts`
  - `processed_comment_ids[]`
  - `processed_thread_ids[]`
  - `last_batch_commit_sha`
- Writes must be atomic (all-or-nothing).
- If checkpoint write fails, stop loop and raise an exception notification (prevents duplicate reprocessing).

### 6.2 Review Staleness Escalation SLA
- If PR is in `review` with no reviewer action for 24h: post one polite reminder comment.
- If no reviewer action for 72h: mark workflow state `blocked_review` and include it in the next executive brief.
- Do not send repeated reminder spam; max one reminder per 24h window.

### 6.3 Branch Concurrency and Worktree Policy
- One active automation run per branch at a time (**branch lock required**).
- Default mode: one branch per working directory; do not switch branches inside an active run.
- Parallel branch execution is allowed only via **git worktrees** (one worktree per branch).
- CI auto-remediation must only commit/push to the current branch lock owner.
- Final promotion gates (merge-readiness validation and handoff) are serialized in a single promotion lane.
- Keep `AI_DEV_WORKFLOW_AUTO_FIX_ALL_BRANCHES` disabled in normal operation.

## 6.4 Local Supabase + Browser Validation Requirements
- For backend/integration-affecting changes, local Supabase validation must follow `automation/ai-workflow/supabase-local-runbook.md`.
- For UI-affecting changes, browser validation must follow `automation/ai-workflow/browser-validation-runbook.md`.
- PR summary comments should include concise validation evidence from these runbooks when applicable.
- Migration safety rules are mandatory:
  - branch migration files must remain the final migration(s),
  - in-place edits to old timestamped migrations are disallowed,
  - use newer timestamped migration files not earlier than latest applied migration timestamp.

## 6.5 Autonomy Guardrails (Required)
- All autonomous execution must comply with `automation/ai-workflow/autonomy-guardrails.md`.
- Budget breaches, low-confidence states, or repeated-failure states must stop mutation and escalate.
- Human override modes (`PAUSE_AUTONOMY`, `NO_COMMIT_MODE`, `REVIEW_ONLY_MODE`) take precedence over normal execution.
- Behavior-changing updates require corresponding test additions/updates unless explicitly justified in PR summary.
- Self-review gate is required before autonomous commit/push.
- Refactor scope is limited to touched modules unless explicitly approved.

## 7) Quality/Definition-of-Done Gates

Before implementation PR is considered ready to merge:

1. Lint/typecheck/tests pass.
2. Playwright coverage for impacted critical paths passes.
3. Visual regression snapshots captured via **GitHub artifact snapshots** with **30-day retention**.
4. UX/design-system review notes included.
5. Architecture review notes included.
6. `Proposal Ref:` present and points to approved proposal.

## 8) Agent Architecture

Constraint from Noel: include dedicated sub-agents; Clippy must never work directly on this repo.

1. **Coordinator Agent (single writer for state transitions)**
   - orchestrates phases and status sync.
2. **Feedback Triage Sub-agent**
   - ranks `on_deck` work from feedback evidence.
3. **Proposal Author Sub-agent**
   - drafts/updates proposal docs and PR content.
4. **QA Guardrail Sub-agent**
   - runs DoD checks including Playwright + visual artifacts.

Policy constraints:
- Allowed execution identity: Open Invite developer agents only.
- Disallowed execution identity: **Clippy**.
- Merge authority: Noel only.

## 9) Phased Rollout Plan

### Phase 1 (proposal-state hardening)
- Adopt authoritative status model + link schema.
- Enforce proposal-first with `Proposal Ref:` requirement.

Acceptance criteria:
- Status transitions follow mapping above.
- Proposal PR links are recorded and used to disambiguate stage.

### Phase 2 (implementation guardrails)
- Enforce one active implementation branch per project.
- Enforce DoD checklist and artifact-based visual regression.

Acceptance criteria:
- Every implementation PR references approved proposal.
- Required QA/UX/architecture evidence present.

### Phase 3 (automation reliability)
- Harden 30-minute change-driven loop and reconciliation.
- Keep no-change silent behavior; alert only on exceptions.

Acceptance criteria:
- No noisy heartbeat comments.
- Sync drift auto-reconciled or escalated with actionable errors.

## 10) Decisions Summary (Noel)

1. Authoritative statuses: `backlog`, `on_deck`, `in_progress`, `review`, `completed`.
2. Triage only projects in `on_deck`.
3. 30-minute automation checks; sub-agent spawned only on detected changes.
4. PR comments processed in batches (not one-by-one).
5. `chatgpt-codex-connector` comments are first-class review input when valid; invalid bot comments require explicit in-thread defer rationale.
6. After each batch push, resolve all addressed comment threads (or post permissions fallback note when resolution is not allowed).
7. Comment-loop dedupe requires unresolved + newer-than-checkpoint + not-already-processed by `comment_id/thread_id`.
8. Checkpoint state is durable + atomic by `(project_id, pr_number)`.
9. Implementation PR must reference approved proposal (`Proposal Ref:` required).
10. One active implementation branch per project.
11. No implementation branch before proposal approval.
12. If proposal PR is merged while in `review`, agent immediately starts implementation and transitions status to `in_progress`.
13. Visual regression uses GitHub artifact snapshots with **30-day retention**.
14. Link validation rollout is app-level first; DB constraints are optional and deferred to later hardening.
15. Retry cap is 2 retries per failing cycle step; then defer with explicit reason.
16. Notify Noel only for errors/exceptions or explicit decisions needed (no no-change noise).
17. Noel is sole merge authority.
18. Clippy is excluded from direct repo work.
19. Branch concurrency uses per-branch locks; parallelism requires separate git worktrees.
20. Promotion/merge-readiness gates run in a serialized lane even when branch work is parallelized.

