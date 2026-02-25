# AGENTS.md — Open Invite Codebase Guide

This file provides **general repository guidance** for any coding agent (IDE agents, CLI agents, CI assistants).
It is intentionally non-automator-specific.

## 1) Repository map
- `domains/` — domain-driven feature modules (UI + domain logic)
- `services/` — service-layer integrations and shared app services
- `pages/` — route/page entry points
- `lib/` — shared utilities/framework helpers
- `supabase/` — DB config, migrations, and seed data
- `test/` — test utilities and test modules
- `automation/ai-workflow/` — automation policy/runbooks/scripts (for autonomous workflow operators)
- `.github/` — PR templates and GitHub automation

## 2) Organization rules
- Keep domain logic near its owning domain.
- Prefer extending existing modules over creating near-duplicates.
- Extract reusable UI/patterns when repeated in multiple places.
- Keep commits scoped and reversible.

## 3) Code quality expectations
- Run lint/typecheck/tests/build before marking work ready.
- Behavior-changing updates should include or update tests.
- Keep naming and APIs consistent with existing patterns.
- Avoid speculative abstractions; extract generics from real repeated use-cases.

## 4) Migrations and data safety
- Treat migrations as append-only history.
- Do not edit old migration files in place.
- New migration files should use fresh timestamps and preserve ordering.
- If branch migration ordering drifts after rebases/merges, fix by creating/renaming to newer migrations.

## 7) Branch and PR hygiene
- Rebase when branch is behind `main` and resolve conflicts cleanly.
- If commit history is noisy, squash when it improves reviewability.
- PR summaries should clearly include:
  - functional changes
  - UI/UX impact
  - validation evidence
  - notable refactors
  - known follow-ups/risks

## 8) Where automation-specific policy lives
Automation workflow details are intentionally separated under:
- `automation/ai-workflow/`
