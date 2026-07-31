# Brief — Design a Proper Branch/Preview Database Strategy (Supabase)

- **Doc ID:** OI-BRIEF-20260731-supabase-branch-db-strategy
- **Type:** Design brief (input for a new session — **design not started**)
- **Status:** Draft / hand-off
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-31
- **Ask:** Produce a design/PRD for how database schema + data should be isolated,
  migrated, and previewed **per Git branch / per PR**. This brief only frames the
  problem, current state, and references — **do not implement, and do not commit a
  design yet.**

---

## 1. Why this is needed

Feature work increasingly ships DB changes (migrations, RLS, buckets, seed rows)
alongside frontend changes — e.g. the current file-uploads/event-banner work adds a
storage bucket, `storage.objects` policies, and a `feature_flags` row. We hit a concrete
gap: **a PR's Netlify deploy-preview contains the new frontend code but none of the
branch's database changes**, because migrations are not applied for PRs and all previews
point at one shared Supabase project. So a feature can't be exercised end-to-end before
merge, and migrations get their first real run against **staging** on merge to `main`.

The goal of the new session is to design a branch-aware DB strategy that makes PRs
**self-contained and testable**, reduces drift between local/staging/prod, and de-risks
migrations — without unacceptable cost or operational complexity.

## 2. Current state (verified in-repo — cite these when designing)

- **Migrations:** `supabase/migrations/*` — append-only, timestamped. Rules in
  `AGENTS.md §6` (never edit old files; fresh timestamps; fix ordering after rebases).
- **Seed:** `supabase/seed.sql` (~87 KB) — applied on a full DB reset.
- **Local config:** `supabase/config.toml`. Note `[storage] enabled`, `schemas`, and the
  presence of `supabase/.branches/` and `supabase/.temp/` (Supabase CLI local-branch
  artifacts).
- **Staging deploy — DESTRUCTIVE:** `.github/workflows/deploy-staging.yml` runs on push to
  `main`: `supabase link --project-ref …` then **`supabase db reset --linked --yes`**
  (drops + re-applies all migrations + seed on the shared staging DB every deploy), then
  builds the frontend with `VITE_APP_ENV=staging`.
- **Production deploy — additive:** `.github/workflows/deploy-production.yml` runs
  `supabase migration up --linked` (forward-only; no reset).
- **PR checks — no DB at all:** `.github/workflows/pr.yml` runs lint / types / test /
  build only. It **never touches Supabase**, so migrations are never validated pre-merge.
- **Preview hosting:** Netlify (`netlify.toml` — build happens in GH Actions, Netlify used
  for redirects + `event-og` edge function). The `netlify/openinvitestaging/deploy-preview`
  check builds the PR branch but its `VITE_SUPABASE_*` env points at a **shared** project
  (staging), so every preview shares one database with no per-branch isolation.
- **Client dependence on DB state:** feature flags are read at runtime from the
  `feature_flags` table (`lib/featureFlags.tsx`); absent rows fall back to `false`. So a
  flag/bucket/table introduced by a migration is invisible/broken in any environment where
  that migration hasn't run.
- **Env surface:** `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_PEXELS_API`, `VITE_APP_ENV`, plus Google OAuth secrets used during `db reset`.

## 3. Problems to solve

1. **No per-branch/per-PR DB isolation** — all previews share staging; concurrent PRs
   with schema changes collide.
2. **Migrations untested before merge** — first realistic apply is on merge to `main`
   (staging), so breakage is discovered late.
3. **Destructive staging reset** — `db reset` on every `main` deploy wipes staging data
   and re-seeds; brittle for QA and anyone relying on staging state.
4. **Preview ≠ production shape** — frontend-only previews can't validate RLS, triggers,
   buckets, or flag-gated features end-to-end.
5. **Drift risk** across local ↔ staging ↔ prod (esp. since prod is forward-only but
   staging is reset-based).
6. **Seed/data management** — how much seed, PII-safety, and per-branch data lifecycle are
   undefined.

## 4. Scope of the design task (what the new session should deliver)

- A recommended **branch/preview DB model** with rationale and trade-offs (cost, ops,
  latency-to-preview, isolation strength).
- How **migrations** run per branch (apply forward vs reset), how **drift** is detected
  (`supabase db diff`), and how the append-only rule (AGENTS.md §6) is enforced in CI.
- **Seed strategy** per environment/branch (fixtures, size, PII-safety, idempotency).
- **CI/CD wiring**: what changes in `pr.yml` / `deploy-staging.yml` / `deploy-production.yml`,
  and how per-branch Supabase credentials get injected into the Netlify preview build.
- **Teardown/lifecycle**: when branch databases are created/destroyed; orphan cleanup.
- **Secrets & auth**: per-branch OAuth redirect URLs, service keys, and how the client
  picks up per-branch `VITE_SUPABASE_*`.
- **Migration safety**: pre-merge validation gate, forward-only guarantees for prod, and a
  rollback/repair story.
- A **rollout/adoption plan** and explicit **non-goals**.

## 5. Options to evaluate (do not pre-judge — compare)

1. **Supabase Branching (Git-integrated preview branches)** — per-PR isolated Postgres
   instances that auto-run migrations + seed and expose per-branch connection details for
   the preview build. Evaluate: cost per branch, provisioning time, config via
   `config.toml [branching]` / remotes, Netlify env injection, persistent vs preview
   branches, region/pricing constraints.
2. **Manually-managed per-PR Supabase projects** (scripted create/seed/destroy in CI) —
   more control, more ops burden.
3. **Ephemeral local Postgres in CI** (`supabase start` / `db reset` in a job) to *test*
   migrations + RLS pre-merge, even if the deployed preview still shares staging — a
   cheaper partial fix for Problem 2.
4. **Shadow-DB / `db diff` gate only** — validate migrations & catch drift in CI without
   full per-branch previews.
5. **Status quo + guardrails** — keep shared staging but add a migration-validation gate
   and stop destructive resets; document limits.

These aren't mutually exclusive (e.g. 3 + 4 as a baseline, 1 for full previews). Recommend
a primary path and note fallbacks.

## 6. Constraints & non-negotiables

- **Prod is forward-only** — never `db reset` production; keep `migration up`.
- **Append-only migrations** — preserve AGENTS.md §6; the design must reinforce, not break, it.
- **Cost-aware** — flag any per-branch spend and give a cheaper fallback.
- **Secrets hygiene** — no secrets committed; per-branch creds via CI secret store / Netlify env.
- **Backwards-compatible** — existing local dev (`pnpm supabase:*` scripts in `package.json`)
  should keep working or have a clear migration path.
- **Verify against current Supabase docs/pricing** — features and limits evolve; this brief's
  author knowledge cutoff is Jan 2026, so confirm Branching availability, pricing, and API
  before committing to it.

## 7. References

**In-repo (read these first):**
- `AGENTS.md` §6 — migration/data-safety rules.
- `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`,
  `supabase/.branches/`, `supabase/.temp/`.
- `.github/workflows/deploy-staging.yml`, `deploy-production.yml`, `pr.yml`,
  `supabase-keepalive.yml`, and `.github/workflows/README.md`.
- `netlify.toml`; `lib/featureFlags.tsx` (runtime DB dependence); `.env.example`.
- `package.json` scripts: `supabase:start|stop|reset|migrate|studio`,
  `ai-workflow:check-migrations` (`automation/ai-workflow/scripts/check-migration-order.sh`).
- `automation/ai-workflow/runbooks/supabase-local.md`.
- Related prior docs for house style/format:
  `docs/projects/OI-PRD-20260717-harden-notifications.md`,
  `docs/projects/OI-PRD-20260717-file-uploads-event-banners.md`.

**External (confirm current versions):**
- Supabase Branching (Git-integrated preview branches) — concepts, setup, config.toml
  `[branching]`, persistent vs preview branches, pricing.
- Supabase CLI: `supabase branches` (list/create/delete/get), `supabase db diff`,
  `supabase db push`, `supabase migration up`, `supabase db reset`, `supabase link`.
- Supabase local development & seeding; declarative schema / migration workflow.
- Netlify deploy-preview environment variables & per-branch/context env (and how to inject
  branch-specific `VITE_SUPABASE_*` at build time in the GH Actions build).
- Supabase Storage RLS + buckets in migrations (relevant since previews must reproduce
  bucket/policy state introduced by feature migrations).

## 8. Suggested deliverable

A PRD (`docs/projects/OI-PRD-<date>-branch-db-strategy.md`) following the house format of the
two PRDs referenced above: Summary, Goals/Non-Goals, Current State, Requirements, Proposed
Design (chosen option + rejected alternatives), CI/CD changes, Migration & Seed plan,
Rollout, Risks, Open Questions, Milestones — plus a short cost estimate for any per-branch
infrastructure.
