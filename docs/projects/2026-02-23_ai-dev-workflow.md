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

10. Implementation PR merged by Noel
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

1. Agent does not respond to comments one-by-one.
2. Agent collects all new PR comments since last checkpoint.
3. Agent synthesizes one update plan, applies changes in one batch, pushes once.
4. Agent posts one summary comment (resolved/deferred/ready for re-review).

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
   - new PR comments/reviews on tracked proposal/implementation PRs.
2. If no changes, do nothing (no noisy notification).
3. Spawn sub-agent work **only when changes are detected**.
4. Notify Noel only on errors/exceptions or when human decision is required.

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
4. PR comments processed in batches.
5. Visual regression via GitHub artifact snapshots with **30-day retention**.
6. No implementation branch before proposal approval.
7. If proposal PR is merged while in `review`, agent immediately starts implementation and transitions status to `in_progress`.
8. Implementation PR must reference approved proposal (`Proposal Ref:` required).
9. One active implementation branch per project.
10. Link validation rollout is app-level first; DB constraints are optional and deferred to later hardening.
11. Notify Noel only for errors/exceptions (not no-change loops).
12. Noel is sole merge authority.
13. Clippy is excluded from direct repo work.

## 11) Finalized Policy Decisions

1. On proposal PR merge during `review`, the agent immediately initiates implementation and moves status to `in_progress`.
2. Link validation rollout order is fixed: application-level validation first; optional DB constraints deferred to a later hardening phase.
3. Visual regression artifact retention is fixed at 30 days.
