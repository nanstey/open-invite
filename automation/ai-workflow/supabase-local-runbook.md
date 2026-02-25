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

## Standard lifecycle
1. Start stack
```bash
corepack pnpm supabase:start
```
2. Apply migrations
```bash
corepack pnpm supabase:migrate
```
3. (Optional) reset when needed
```bash
corepack pnpm supabase:reset
```
4. Inspect logs when failing tests/dev flows
```bash
corepack pnpm supabase:logs
corepack pnpm supabase:logs:auth
```
5. Stop stack when cycle completes or on idle
```bash
corepack pnpm supabase:stop
```

## Automation usage guidance
- Pre-check before integration tests:
  - Ensure local Supabase is running.
  - Ensure migrations are applied.
- On reproducible schema drift:
  - Capture reason in PR comment summary.
  - Perform reset once, then re-run checks.

## Failure triage
- Migration failure:
  - verify migration ordering and idempotency
  - inspect DB container logs
- Auth callback/login issues:
  - inspect auth logs
  - verify expected local callback URLs
- Data mismatch after branch switch:
  - run reset + migrate and re-test
