# Local Supabase Runbook (Open Invite AI Workflow)

This runbook defines how automation should use the local Supabase stack safely and repeatably.

## Purpose
- Provide deterministic local DB/auth/storage behavior for dev/test cycles.
- Avoid accidental destructive actions against non-local environments.

## Safety rules
- Local-only operations: never point these commands at staging/production.
- Use branch/worktree isolation for concurrent runs.
- Prefer `supabase migration up` over reset during normal iteration.
- Use `supabase db reset` only when explicitly required by migration/seed drift.
- Migration order guardrails:
  - branch migrations must be the latest/final migrations,
  - do not modify old migration files in place,
  - when migration logic changes, create/rename to newer timestamped migration files.

## Standard lifecycle
1. Start stack
```bash
corepack pnpm supabase:start
```
2. Context-aware schema step
- If migration/seed changed on this branch vs merge-base: run reset.
- Otherwise: run forward migrate.
```bash
# auto-decided by validation helper
corepack pnpm ai-workflow:validate-local
```
3. Inspect logs when failing tests/dev flows
```bash
corepack pnpm supabase:logs
corepack pnpm supabase:logs:auth
```
4. Stop stack when cycle completes or on idle
```bash
corepack pnpm supabase:stop
```

## Automation usage guidance
- Pre-check before integration tests:
  - Ensure local Supabase is running.
  - Ensure migrations are applied (or reset when schema/seed changed).
- Reset decision rule:
  - reset when `supabase/migrations/**` or `supabase/seed.sql` changed on branch
  - otherwise avoid reset and use forward migration
- On reproducible schema drift despite no detected schema changes:
  - Capture reason in PR comment summary.
  - Perform forced reset once, then re-run checks.

## Failure triage
- Migration failure:
  - verify migration ordering and idempotency
  - inspect DB container logs
- Auth callback/login issues:
  - inspect auth logs
  - verify expected local callback URLs
- Data mismatch after branch switch:
  - run reset + migrate and re-test
