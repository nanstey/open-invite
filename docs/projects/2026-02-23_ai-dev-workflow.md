# RFC: AI-Driven Development Workflow (Feedback-Prioritized)

- **Date:** 2026-02-23
- **Status:** Proposed
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

## 2) Current Context (Codebase + Data)

### 2.1 Repository conventions observed

- Domain-oriented frontend structure (`domains/*`) with shared utilities in `lib/*`.
- Lint/format baseline via Biome (`biome.json`), with Husky + lint-staged for pre-commit checks.
- Unit tests via Vitest (`pnpm test`).
- Supabase local workflows are already scripted (`pnpm run supabase:start`, `supabase:migrate`, etc.).
- CI/CD deployment workflows exist for staging/production in `.github/workflows`.

### 2.2 Feedback data model observed (Supabase)

From migrations:
- `20260130000000_add_user_feedback.sql`
- `20260130010000_add_feedback_projects.sql`

Key tables and relationship:
- `public.user_feedback`
  - includes `type`, `importance`, `status`, `title`, `description`, timestamps
  - status enum: `new`, `reviewed`, `planned`, `done`, `declined`
  - RLS: users can submit/view own feedback; admins can view/update all
- `public.feedback_projects`
  - project container with status enum: `backlog`, `on_deck`, `in_progress`, `review`, `completed`, `archived`
- `public.feedback_project_items`
  - join table linking feedback entries to projects
  - unique `(project_id, feedback_id)`

This gives enough structure to prioritize work from real customer feedback and group related items into project proposals.

## 3) Goals and Non-Goals

### Goals
1. Prioritize work from production feedback data.
2. Require proposal-first planning for new projects.
3. Keep Noel as final merge authority (agent never merges).
4. Batch-handle PR comments for coherent revisions.
5. Enforce local run + Supabase + test/lint + browser QA discipline.
6. Add architecture/design-system review checkpoints.

### Non-Goals
- Replacing human product judgment.
- Fully autonomous merges/deployments.
- Building a general-purpose agent platform outside this repo’s needs.

## 4) Proposed Workflow (End-to-End)

## Phase A: Intake + Prioritization

1. Query/inspect production feedback (`user_feedback`, `feedback_projects`, `feedback_project_items`).
2. Rank opportunities with a simple score:
   - `priority_score = importance_weight + volume_weight + recency_weight + strategic_weight`
3. Select top candidate project(s) and link source feedback IDs.

**Output:** selected project candidate with evidence from feedback data.

## Phase B: Proposal Authoring (required before implementation)

For each new project, the Proposal Agent must:
1. Read project description and relevant code paths.
2. Ask clarifying questions when requirements are ambiguous.
3. Produce proposal markdown in `docs/projects/{YYYY-MM-DD}_{project-name}.md`.

Required proposal sections:
- Project brief
- Assumptions
- Key features/outcomes
- High-level implementation
- Remaining open questions

Proposal is submitted by PR, and Noel is notified when ready for review.

## Phase C: Review + Batch PR Comment Handling

1. Agent does **not** respond to each comment in isolation.
2. Agent collects all new PR comments since last checkpoint.
3. Agent synthesizes a single update plan, applies changes in one batch, pushes once.
4. Agent posts one summary comment: what changed, what remains, and marks ready for re-review.

## Phase D: Implementation After Proposal Approval

After proposal merge/approval:
1. Create feature branch.
2. Implement according to approved proposal.
3. Allow acceptance criteria refinement if discoveries occur; document deltas in PR.
4. Agent never merges. Noel performs merge.

## 5) Recommended Agent Architecture

> Constraint from Noel: include at least one dedicated sub-agent, and **Clippy must never work directly on this repo**.

### 5.1 Agents and responsibilities

1. **Coordinator Agent (primary, repo-scoped)**
   - Orchestrates phases, owns PR state transitions, asks clarifying questions.
2. **Feedback Triage Sub-agent (dedicated)**
   - Reads feedback tables, computes priority packs, outputs ranked project candidates.
3. **Proposal Author Sub-agent (dedicated)**
   - Generates/updates proposal markdown from approved candidate and codebase context.
4. **QA Guardrail Sub-agent (dedicated)**
   - Runs lint/tests/build, validates local app + Supabase startup, runs Playwright smoke/visual checks.

### 5.2 Policy constraints

- Allowed execution identity: Open Invite developer agents only.
- Disallowed execution identity: **Clippy** (explicit denylist for this repo).
- Merge authority: Noel only.

## 6) Tooling, Skills/Agents, and Credentials

### 6.1 Required tools

- Git + GitHub CLI (`gh`) for branching/PR flow
- Node + pnpm
- Supabase CLI + Docker (`pnpm run supabase:start`)
- Vitest (`pnpm test`)
- Biome (`pnpm run lint`, `pnpm run format:check`)
- Playwright (E2E + visual regression baseline and diffing)

### 6.2 Required skills/agent capabilities

- Supabase schema/RLS literacy
- Repo navigation and domain-structured React/TS coding
- Test authoring (unit/integration/E2E)
- PR review synthesis + batched response writing
- Design-system consistency review (current repo has active UI standardization direction)

### 6.3 Required credentials/secrets

Local dev:
- `.env.local`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

GitHub/CI environments (from existing workflow docs):
- `SUPABASE_ACCESS_TOKEN`
- `NETLIFY_AUTH_TOKEN`
- env-specific: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `NETLIFY_SITE_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- optional OAuth provider secrets for Google auth flows

Agent/GitHub operations:
- `gh` authenticated user with PR create/comment/read access

## 7) Baseline Engineering Standards (Formalized)

Minimum standards for AI-produced work in this repo:

1. **Architecture & modularity**
   - Keep domain boundaries clear (`domains/*` first, shared logic in `lib/*`).
   - Prefer composable modules; avoid oversized mixed-responsibility components.
2. **Code style/quality**
   - Pass Biome lint + formatting.
   - Keep types explicit at boundaries; avoid unnecessary `any`.
3. **Local runtime confidence**
   - Must boot app locally.
   - Must run local Supabase (`pnpm run supabase:start`) and migrations when schema-related.
4. **Testing**
   - Unit/integration tests for behavior changes.
   - Playwright smoke coverage for critical user paths.
   - Visual regression snapshots for high-impact UI surfaces.
5. **Review gates**
   - Architecture review (scope, modularity, coupling).
   - Frontend design-system review (consistency with shared UI direction; reduce duplicate primitives).
6. **PR hygiene**
   - Small, traceable commits.
   - Link implementation to approved proposal.
   - Batch response to reviewer comments.

### Suggested improvements

- Add CI job for Playwright visual regression on PRs.
- Add a PR template with required checkboxes for:
  - Supabase local run,
  - lint/tests,
  - architecture review,
  - design-system review,
  - feedback linkage IDs.

## 8) PR Comment Heartbeat/Check Loop (Batch Mode)

Purpose: Poll for new review input without noisy per-comment reactions.

Proposed loop:
1. Every 30 minutes during active review window (e.g., 08:00–18:00 local), fetch PR comments/reviews.
2. If no new comments: no action.
3. If new comments exist:
   - aggregate all unseen comments,
   - deduplicate overlapping asks,
   - classify as must-fix / should-fix / question,
   - generate one consolidated patch set.
4. Push one update commit (or small coherent set), then post one summary comment:
   - resolved items
   - deferred items with rationale
   - explicit “ready for re-review”.

Checkpoint state to persist per PR:
- `last_seen_comment_timestamp`
- `last_seen_review_id`
- `last_batch_update_commit_sha`

## 9) Phased Rollout Plan

## Phase 1 (Pilot: Proposal-only flow)
- Implement proposal-first process for 1–2 feedback-prioritized projects.
- Enforce Noel-only merge rule.

**Acceptance criteria**
- Proposal files created under `docs/projects/` with required sections.
- PR opened and reviewed by Noel.
- At least one batched comment-response cycle completed.

**Risks**
- Under-specified proposals if clarifying questions are skipped.

## Phase 2 (Implementation guardrails)
- Add mandatory QA checklist (Supabase start, app boot, lint/tests, Playwright smoke).
- Add architecture/design-system review steps.

**Acceptance criteria**
- Each implementation PR includes evidence of checks.
- No direct merges by agent.

**Risks**
- Longer cycle times while standards normalize.

## Phase 3 (Automation hardening)
- Add CI automation for visual regression and PR template enforcement.
- Refine prioritization scoring from real delivery outcomes.

**Acceptance criteria**
- Reduced regressions and faster reviewer turnaround.
- Prioritization rationale visible in project proposals.

**Risks**
- CI flakiness (especially browser tests) if environment not stabilized.

## 10) Decisions Summary

1. Feedback data in Supabase is the source of prioritization truth.
2. Proposal PR is required before feature implementation.
3. PR comments handled in batched updates, not piecemeal.
4. Noel is the sole merge authority.
5. Clippy is explicitly excluded from direct repo work.
6. Quality gates include local app boot, local Supabase, lint/tests, Playwright (with visual regression direction), and architecture/design-system reviews.

## 11) Open Questions for Noel

1. Preferred initial weighting for the prioritization score (importance vs volume vs recency vs strategic)?
2. Should the PR comment heartbeat run only on business hours, or 24/7 with quiet windows?
3. For visual regression, do you prefer:
   - GitHub artifact snapshots only, or
   - a hosted baseline tool/service?
4. Do you want a hard policy that implementation PRs must reference an approved proposal file path?
