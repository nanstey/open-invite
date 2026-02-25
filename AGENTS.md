# AGENTS.md — Open Invite Codebase Guide

This file provides **general repository guidance** for any coding agent (IDE agents, CLI agents, CI assistants).
It is intentionally non-automator-specific.

## 1) Repository map
- `domains/` — domain-driven feature modules (UI + domain logic)
- `services/` — service-layer integrations and shared app services
- `pages/` — route/page entry points
- `lib/` — shared utilities/framework helpers
- `supabase/` — DB config, migrations, and seed data
- `tests/` — test setup and route-level tests
- `automation/ai-workflow/` — automation policy/runbooks/scripts (for autonomous workflow operators)
- `.github/` — PR templates and GitHub automation

## 2) Command matrix
- Install: `pnpm install`
- Dev app: `pnpm run dev`
- Type-check: `pnpm run types`
- Lint: `pnpm run lint`
- Tests: `pnpm test -- --run`
- Build: `pnpm run build`
- Full local validation chain: `pnpm run ai-workflow:validate-local`

## 3) Organization rules
- Keep domain logic near its owning domain.
- Prefer extending existing modules over creating near-duplicates.
- Extract reusable UI/patterns when repeated in multiple places.
- Keep commits scoped and reversible.

## 4) Code quality expectations
- Run lint/typecheck/tests/build before marking work ready.
- Behavior-changing updates should include or update tests.
- Keep naming and APIs consistent with existing patterns.
- Avoid speculative abstractions; extract generics from real repeated use-cases.

## 5) Definition of done
- Required checks pass locally: lint, types, tests, build.
- Any behavior change has tests or a documented rationale for no test update.
- PR summary includes validation evidence and notable risks/follow-ups.

## 6) Migrations and data safety
- Treat migrations as append-only history.
- Do not edit old migration files in place.
- New migration files should use fresh timestamps and preserve ordering.
- If branch migration ordering drifts after rebases/merges, fix by creating or renaming migrations to newer timestamps.

## 7) Automation boundary
- Keep root `AGENTS.md` focused on repository-wide coding norms.
- Keep autonomous workflow rules in `automation/ai-workflow/`.
