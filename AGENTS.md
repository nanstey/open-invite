# AGENTS.md — Open Invite Agent Operating Rules

This file is the repository-level contract for all agents (OpenClaw, IDE agents, CI agents).

## 1) Execution Goals
- Ship correct product behavior.
- Maintain consistent UX/UI patterns across the app.
- Increase reuse and composability over time.
- Keep changes reversible and reviewable.

## 2) Required Delivery Sequence
For any task/PR, run work in this order:
1. Functional correctness
2. Visual/UX correctness
3. Validation gates (lint/tests/build + relevant DB/browser checks)
4. **Post-goal refactor pass** (mandatory)

## 3) Mandatory Post-goal Refactor Pass
After functional + visual goals are met, agents must review all touched files and:
- DRY repeated logic and markup
- extract repeated UI sections into composable sub-components
- extract list/loop-rendered structures into reusable units where sensible
- prefer shared primitives for common visuals/behavior
- reduce cross-domain duplication where APIs/semantics align

### Heuristics for extraction
- Distinct page section repeated in 2+ places -> candidate component
- Similar loop item rendering in multiple views -> candidate reusable list item/row
- Similar interactions with slight variant behavior -> candidate generic + adapter props

## 4) Refactor Scope Guardrails
- Refactor touched files/modules first.
- Cross-cutting refactors are allowed only when low-risk and clearly bounded.
- Large architectural refactors should be split into dedicated PRs.
- Do not mix broad refactor + large feature delta unless explicitly requested.

## 5) UI/UX Consistency Rules
- Preserve a consistent look/feel/interaction across domains.
- Prefer existing shared UI patterns before creating new variants.
- If introducing a new visual pattern, justify why existing primitives are insufficient.
- Normalize naming and prop contracts for similar components.

## 6) Generic Component Policy
- Generic abstraction is encouraged only with real repeated use-cases.
- Avoid speculative over-generalization.
- Keep domain semantics explicit at boundaries.
- Favor composition over inheritance-like prop complexity.

## 7) Testing + Validation Expectations
- Lint/typecheck/tests/build must pass (or be explicitly justified).
- Behavior-changing updates should include/adjust tests.
- Backend/integration-sensitive changes should follow local Supabase runbook.
- UI-affecting changes should follow browser validation runbook with concise evidence.

## 8) Branch + Migration Safety
- Keep PR branches fresh against `main` (rebase + resolve conflicts when behind).
- If commit history is noisy, squash before rebase when it improves clarity.
- Migration files must remain latest/final in order.
- Do not modify historical migration files in place; create newer timestamped migrations.

## 9) PR Reporting Contract
PR summary should clearly state:
- Functional changes
- Visual/UX changes
- Refactors performed (what was extracted/reused)
- Validation evidence run
- Deferred follow-ups/risks

## 10) Source of Truth for Automation
For automation behavior, refer to:
- `automation/ai-workflow/policy.md`
- `automation/ai-workflow/cycle-checklist.md`
- `automation/ai-workflow/autonomy-guardrails.md`
- `automation/ai-workflow/openclaw-operations.md`
