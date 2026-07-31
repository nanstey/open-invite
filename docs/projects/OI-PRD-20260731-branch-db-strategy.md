# PRD — Branch/Preview Database Strategy (Supabase)

- **Doc ID:** OI-PRD-20260731-branch-db-strategy
- **Status:** Draft (for review)
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-31
- **Change type prefix:** `ci` / `chore` (workflow + config; no product code)
- **Reserved branch:** `claude/supabase-branch-db-strategy`
- **Input brief:** `OI-BRIEF-20260731-supabase-branch-db-strategy`
- **Related:** `OI-PRD-20260717-file-uploads-event-banners` (adds a storage bucket +
  `storage.objects` policies + a `feature_flags` row — the concrete motivating case);
  `OI-PRD-20260717-harden-notifications` (adds triggers/RLS that a preview must reproduce).

> **External facts in this PRD were verified against current Supabase/Netlify docs on
> 2026-07-31** (the brief's author cutoff is Jan 2026). The single most important
> correction to the brief's framing: **there is no "cheap / shared-instance" branch
> model.** Every Supabase preview or persistent branch is a *full, isolated Supabase
> project billed per compute-hour*, requires the **Pro plan or above**, and **compute
> credits do not apply to branches**. This reality drives the phased, cost-gated design
> below rather than "a branch for every PR."

---

## 1. Summary

Feature work now ships **database** changes (migrations, RLS, storage buckets, seed rows)
alongside frontend changes, but our delivery pipeline treats the database as an
afterthought:

1. **PRs never touch the database.** `.github/workflows/pr.yml` runs lint / types / test /
   build only. Migrations get their **first realistic apply on merge to `main`**
   (staging), so a broken migration, RLS regression, or ordering drift is discovered
   *after* merge, not before.
2. **Every preview shares one database.** The Netlify `deploy-preview` build compiles the
   PR's frontend but bakes in **staging** `VITE_SUPABASE_*` (env is inlined at Vite build
   time). A feature that depends on a new table/flag/bucket is invisible or broken in its
   own preview, and concurrent PRs with schema changes collide on the one shared DB.
3. **Staging is wiped on every deploy.** `deploy-staging.yml` runs
   `supabase db reset --linked --yes` on every push to `main` — dropping and re-seeding the
   shared staging DB — which is destructive to QA state and is a different apply model from
   production's forward-only `migration up`.

This PRD specifies a **branch-aware database strategy** in two phases:

- **Phase 1 (baseline, ~zero marginal cost):** validate migrations + RLS + seed on **every
  PR** using an ephemeral local Postgres in CI, enforce the append-only rule in CI, add a
  drift gate, and **stop the destructive staging reset** (make staging forward-only like
  prod, with a manual rebuild escape hatch). This closes Problems (1) and (3) and most of
  the drift risk without any per-branch spend.
- **Phase 2 (full previews, opt-in and cost-gated):** adopt **Supabase Branching** to give
  **DB-affecting PRs** a real isolated database, wired into the Netlify preview build, so
  those PRs are testable end-to-end. Gated behind a label so we only pay for branches when
  a PR actually needs one.

The result: PRs become **self-contained and testable**, migrations are **de-risked before
merge**, staging stops being clobbered, and drift between local ↔ staging ↔ prod shrinks —
while per-branch spend stays bounded and optional.

## 2. Goals & Non-Goals

### Goals
- **Migrations validated pre-merge.** Every PR proves that all migrations apply cleanly
  from scratch and that `seed.sql` loads, on an ephemeral DB — no shared-DB, no cost.
- **Append-only rule enforced in CI**, not just by convention (AGENTS.md §6 /
  `check-migration-order.sh`).
- **Drift detected** — CI flags when migrations don't fully describe the schema
  (`supabase db diff`), with explicit acknowledgement of what `db diff` cannot see.
- **Non-destructive staging.** Stop resetting staging on every deploy; align staging with
  production's forward-only apply; keep a deliberate, manual rebuild path.
- **Per-PR DB isolation available on demand** for PRs that change the database, so RLS,
  triggers, buckets, and flag-gated features can be exercised end-to-end in the preview.
- **Bounded, predictable cost** with a cheaper fallback documented at every step.
- **Backwards-compatible local dev** — existing `pnpm supabase:*` scripts and the
  local runbook keep working.

### Non-Goals
- **Not** provisioning a branch for every PR (cost + provisioning latency; most PRs are
  frontend-only). Full previews are opt-in.
- **Not** changing production's forward-only model. Prod stays `migration up`; **never
  reset production.**
- **Not** copying production data into any branch/preview (privacy; branches start empty
  by design).
- **Not** solving realistic/large-scale seed data or synthetic-data generation — seed
  remains the small `@example.com` fixture set, sized for correctness not volume.
- **Not** migrating hosting off Netlify or the build off GitHub Actions.
- **Not** implementing the changes in this PRD — this document is design-only per the
  brief; implementation is a follow-up once the approach is approved.

## 3. Current State (verified in-repo, 2026-07-31)

| Aspect | Today | Problem |
| --- | --- | --- |
| **PR checks** (`pr.yml`) | lint / types / test / build; **never touches Supabase** | Migrations/RLS/seed unvalidated until merge. |
| **Staging deploy** (`deploy-staging.yml`) | push to `main` → `supabase link` + **`supabase db reset --linked --yes`** + build (`VITE_APP_ENV=staging`) + `netlify deploy --prod` | **Destructive**: wipes + re-seeds shared staging every deploy; brittle for QA. |
| **Production deploy** (`deploy-production.yml`) | release published → `supabase migration up --linked` (forward-only) + build + deploy | Correct model — keep. Divergence from staging's reset model = drift risk. |
| **Previews** | Netlify `deploy-preview` builds the PR branch; `VITE_SUPABASE_*` point at **shared staging** | No per-branch DB; concurrent schema PRs collide; feature ≠ its DB. |
| **Migrations** | 28 files in `supabase/migrations/`, append-only, `YYYYMMDDHHMMSS_*.sql` | Ordering enforced only by `check-migration-order.sh`, **not wired into PR CI**. |
| **Migration guard** | `automation/ai-workflow/scripts/check-migration-order.sh` (`pnpm ai-workflow:check-migrations`) — rejects out-of-order + in-place edits vs `origin/main` | Exists and works; runs locally only, not a required PR check. |
| **Seed** | `supabase/seed.sql` (~85 KB); seeds `auth.users`, `auth.identities`, and ~12 `public.*` tables; **all emails `@example.com`** (PII-safe) | Applied only on `db reset`; not exercised by PR CI. |
| **Local config** | `supabase/config.toml` — `[storage] enabled`, `schemas = [public, storage, graphql_public]`, `auth.external.google enabled`; **no `[remotes.*]` / branching config** | No branch config exists yet; buckets not declared in config. |
| **Storage buckets** | **No bucket migration exists yet** (arrives with the file-uploads PRD) | `supabase db diff` will *not* capture buckets — see §7/Risks. |
| **Feature flags** | `feature_flags` table read at runtime (`lib/featureFlags.tsx`); missing rows → `false` | A flag introduced by a migration is silently off wherever that migration hasn't run. |
| **Client env** | `lib/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; **baked at build time** | Per-branch preview needs per-branch creds injected *before* the Vite build. |
| **Build location** | Staging/prod builds run in **GitHub Actions**; artifacts pushed via `netlify deploy --dir=dist`. Netlify env vars intentionally unused (`.github/workflows/README.md`). PR `deploy-preview` builds on Netlify with staging env. | Two build paths; per-branch env must be handled in **Actions**, not via Netlify contexts. |
| **OAuth** | Google OAuth configured per-project in Supabase Dashboard + Google Cloud Console; redirect URLs per environment | Each branch has a **different API URL** → Google sign-in breaks in previews unless reconfigured. |
| **Free-tier signal** | `supabase-keepalive.yml` pings staging+prod daily to dodge the ~7-day free-tier pause | Project is **cost-sensitive**; any per-branch spend must be justified/bounded. |
| **Env surface** | `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PEXELS_API`, `VITE_APP_ENV`, Google OAuth secrets | Establishes the variables a preview build must supply per branch. |

## 4. Requirements

### 4.1 Functional
- **FR-1 Pre-merge migration validation.** On every PR, a CI job provisions an **ephemeral
  Postgres**, applies **all** migrations from scratch, and loads `seed.sql`; failure blocks
  merge. (No shared DB, no per-branch spend.)
- **FR-2 Append-only enforcement.** The same CI job runs `check-migration-order.sh` against
  `origin/main` so out-of-order timestamps and in-place edits of existing migrations fail
  the PR (AGENTS.md §6).
- **FR-3 Drift gate.** CI asserts that committed migrations fully describe the schema
  (`supabase db diff` on a shadow DB yields no diff), with a documented allow-list of
  changes `db diff` cannot detect (storage buckets, publications, `security_invoker`
  views).
- **FR-4 Non-destructive staging.** Staging deploys apply migrations **forward-only**
  (`migration up`), matching production. A **manual** `workflow_dispatch` path performs a
  full `db reset` only when a deliberate rebuild is intended.
- **FR-5 On-demand per-PR database.** A PR labeled `preview-db` (or equivalent) gets an
  **isolated Supabase branch** whose migrations + seed are applied automatically.
- **FR-6 Per-branch preview wiring.** For a `preview-db` PR, the GitHub Actions build
  fetches the branch's API URL + anon key, maps them to `VITE_SUPABASE_*`, builds, and
  deploys that build to the PR's Netlify preview (replacing the staging-pointed build).
- **FR-7 Lifecycle/teardown.** Preview branches are deleted automatically on PR merge/close;
  a scheduled sweep removes orphans; no long-lived preview branch is left billing.
- **FR-8 Local dev unchanged.** `pnpm supabase:start|stop|reset|migrate|studio` and
  `automation/ai-workflow/runbooks/supabase-local.md` continue to work as-is.

### 4.2 Non-Functional
- **Cost:** every mechanism states its spend; the default path (Phase 1) is ~$0. Per-branch
  spend is opt-in and bounded; a "no branching" fallback is always documented.
- **Security / secrets hygiene:** no secrets committed; per-branch creds flow via the
  Supabase→CLI/Management API into GitHub Actions env at build time; service-role keys never
  reach the client bundle.
- **Safety:** production is never reset; forward-only guarantee preserved and, ideally, made
  un-bypassable in CI.
- **Operability:** provisioning latency (branch cold-start can be a couple of minutes) is
  acceptable because branching is opt-in; frontend-only PRs keep the fast existing path.

## 5. Proposed Design

### 5.1 Overview — two phases, decoupled

Phase 1 is independently valuable and should ship first; Phase 2 builds on it. Phase 1
removes the highest-severity, cheapest-to-fix risks (untested migrations; destructive
staging). Phase 2 buys full end-to-end previews for the PRs that actually need them.

```
                         ┌───────────────────────── every PR ─────────────────────────┐
 Phase 1 (baseline, ~$0) │ pr.yml + db-validation job:                                 │
                         │   supabase start (ephemeral) → db reset (migrations+seed)   │
                         │   check-migration-order.sh   → append-only gate             │
                         │   supabase db diff (shadow)  → drift gate                   │
                         └────────────────────────────────────────────────────────────┘
                                          │  (frontend-only PRs stop here; preview = staging, documented)
                                          ▼
                         ┌────────────── PR labeled `preview-db` only ─────────────────┐
 Phase 2 (opt-in, ~$0.40 │ Supabase Branching: isolated branch (migrations+seed auto)  │
   per short-lived PR)   │ GH Actions: `supabase branches get -o env` → VITE_SUPABASE_*│
                         │ build in Actions → `netlify deploy` to the PR's preview     │
                         │ PR merge/close → branch auto-deleted; scheduled orphan sweep│
                         └────────────────────────────────────────────────────────────┘

 Deploy paths:
   staging   (push main):  migration up  (forward-only; manual db reset via workflow_dispatch)
   production(release):    migration up  (unchanged)
```

### 5.2 Phase 1 — CI migration/RLS validation + drift gate + guardrails (chosen baseline)

**A. `db-validation` job in `pr.yml`.** Add one job that runs the DB the way local dev and
staging already do, but throwaway:

1. `supabase/setup-cli@v1` + `supabase db start` (or `supabase start` with unused services
   excluded, mirroring `pnpm supabase:start`).
2. `supabase db reset` → applies **all** migrations in order, then `seed.sql`. A clean exit
   proves migrations apply from scratch and the seed loads. This is the crux of FR-1 and
   directly validates RLS/trigger DDL because it *runs* it.
3. Run `bash automation/ai-workflow/scripts/check-migration-order.sh` with
   `BASE_REF=origin/main` (FR-2). The script already exists and encodes AGENTS.md §6.
4. **Drift gate (FR-3):** `supabase db diff` against the shadow DB; a non-empty diff fails
   the PR (schema not fully captured by migrations). Document the known blind spots
   (buckets, publications, `security_invoker` views) so reviewers don't over-trust a green
   diff.

This needs **no Supabase account, no secrets, no cost** — it's all local containers in the
runner. It is the single highest-leverage change in this PRD.

**B. Stop the destructive staging reset (FR-4).** Change `deploy-staging.yml`'s DB step from
`supabase db reset --linked --yes` to `supabase migration up --linked`, matching
`deploy-production.yml`. Rationale:
- Eliminates the every-deploy wipe of staging QA data (Problem 3).
- Makes staging apply migrations the **same forward-only way** production will, shrinking
  the staging↔prod drift that the reset-vs-forward split creates (Problem 5).
- Add a separate **`workflow_dispatch`**-only job (or an input flag) that performs the full
  `db reset` when a deliberate from-scratch rebuild is wanted (e.g. seed changes, schema
  divergence). This keeps the escape hatch without making it the default.
- *Migration note:* the first forward-only staging deploy after this change assumes staging's
  current schema already matches applied history. If staging has drifted, do **one** final
  manual `db reset` via the new dispatch path to baseline it, then switch to forward-only.

**C. Retire or repurpose the keepalive once on Pro (see §11).** Not required for Phase 1, but
noted: if Phase 2 moves the account to Pro, free-tier pausing goes away and
`supabase-keepalive.yml` can be dropped.

### 5.3 Phase 2 — Supabase Branching for opt-in per-PR previews (chosen, cost-gated)

**Why Branching over hand-rolled projects:** Supabase Branching already does the hard parts —
per-branch isolated Postgres/Auth/Storage/Realtime, auto-apply of `supabase/migrations/*` on
create and on push, `seed.sql` applied to preview branches, auto-delete on PR merge/close,
and per-branch credentials retrievable via CLI/Management API. Rebuilding this with scripted
create/seed/destroy (brief Option 2) is strictly more ops burden for the same outcome.

**Cost-gating (the key decision).** Branching is **not free**: Pro plan required
($25/mo), each branch is an isolated instance at **$0.01344/branch-hour** (Micro), and
**compute credits do not apply**. A short-lived preview branch (~30 h) ≈ **$0.40**. So we do
**not** branch every PR. Instead:
- Branches are provisioned **only for PRs labeled `preview-db`** (apply automatically when a
  PR touches `supabase/**`, or on manual label). Frontend-only PRs keep the existing fast,
  free, staging-pointed preview — with a preview banner/README note that the DB is staging,
  not per-branch.
- This keeps spend proportional to DB work (a handful of dollars/month at our PR volume) and
  provisioning latency off the critical path for the common PR.

**Preview build wiring (FR-6) — the Netlify-specific part.** Supabase auto-injects branch
creds into **Vercel** but **not Netlify**, and our build runs in **GitHub Actions**, so we
own env injection explicitly:

1. In a new `preview-db` Actions job (triggered on labeled PRs), after the Supabase branch is
   ready, run `supabase branches get "$GITHUB_HEAD_REF" -o env >> "$GITHUB_ENV"` (or the
   "Supabase Database Branching Preview" action) to obtain the branch's `API_URL` /
   `ANON_KEY`.
2. Map them to build vars: `VITE_SUPABASE_URL=$API_URL`,
   `VITE_SUPABASE_ANON_KEY=$ANON_KEY`, `VITE_APP_ENV=preview`.
3. `pnpm build`, then `netlify deploy --dir=dist --alias=pr-<n>` to publish to the PR's
   preview URL. Because we deploy a **prebuilt** artifact, Netlify's own deploy-preview build
   (which bakes staging creds) must be **disabled** for these PRs so it doesn't shadow the
   correct build. Netlify deploy contexts/branch env vars are irrelevant here — Actions is the
   single source of truth for env, consistent with the existing README stance.
4. **Never** expose the branch **service-role** key to the client build — only the anon key
   goes into `VITE_*`.

**Config (`config.toml`).** There is **no `[branching]` table**; branch/remote settings live
under **`[remotes.<name>]`** blocks keyed to an existing branch's `project_id`. For preview
branches created by the GitHub integration we need little/no `config.toml` change; if we later
add a **persistent** preview/QA branch, create it first
(`supabase branches create --persistent`) then add its ref to `[remotes.*]` (chicken-and-egg:
the ref must exist before it can be referenced). Storage buckets that must reproduce in
previews are declared via **`[storage.buckets]`** (one of the few blocks synced to production
on merge) — relevant to the file-uploads PRD.

**Lifecycle/teardown (FR-7).** Preview branches auto-pause on inactivity and are **deleted on
PR merge/close** by the GitHub integration. Add a scheduled workflow that lists branches
(`supabase branches list`) and deletes any whose PR is closed/merged as an orphan backstop,
and `log`s what it removed so silent cost creep can't hide.

### 5.4 Rejected / deferred alternatives

- **Branch every PR unconditionally (brief Option 1, ungated).** Rejected: pays for and waits
  on a full instance for frontend-only PRs (the majority), for no benefit. Cost-gating keeps
  the upside without the waste.
- **Manually-scripted per-PR Supabase projects (Option 2).** Rejected: reimplements
  Branching (create/seed/wait-healthy/destroy, per-branch secrets, orphan cleanup) with more
  moving parts and more ways to leak cost. Only revisit if Branching's pricing/limits become
  unacceptable.
- **Ephemeral CI Postgres only, no real previews (Option 3 alone).** Adopted as the Phase 1
  *baseline* but rejected as the *end state*: it validates migrations/RLS but can't give a
  clickable, end-to-end preview of a flag/bucket-gated feature. Phase 2 fills that gap.
- **`db diff` / shadow-DB gate only (Option 4 alone).** Adopted as a *component* of Phase 1
  (FR-3), rejected as a *whole* strategy: drift detection ≠ isolation ≠ previews, and `db
  diff` has real blind spots (buckets/publications/`security_invoker`).
- **Status quo + guardrails only (Option 5).** Its guardrails (stop reset; forward-only
  staging) are **folded into Phase 1**, but on its own it still leaves previews sharing one DB
  and features untestable end-to-end, so it's not the end state.
- **Persistent branch as shared "preview DB" for all PRs.** Rejected as default: a 24/7
  persistent branch (~$9.70/mo) re-creates the shared-DB collision problem it was meant to
  solve. A dedicated persistent QA branch may still be worth it later (see Open Questions),
  but not as the per-PR isolation mechanism.

## 6. CI/CD Changes (what actually changes, by file)

- **`.github/workflows/pr.yml`** — **add** a `db-validation` job: install Supabase CLI,
  `supabase db start`, `supabase db reset` (migrations + seed), run
  `check-migration-order.sh` (`BASE_REF=origin/main`), run the `supabase db diff` drift gate.
  Make it a **required** check. (Existing lint/types/test/build jobs unchanged.)
- **`.github/workflows/deploy-staging.yml`** — **replace** `supabase db reset --linked --yes`
  with `supabase migration up --linked`. **Add** a `workflow_dispatch` input (e.g.
  `full_reset: true`) that runs the reset path on demand. Google OAuth secrets are only needed
  on the reset path (config apply), so the forward-only path can drop them.
- **`.github/workflows/deploy-production.yml`** — **unchanged** (already forward-only). Note as
  the canonical model the others align to.
- **New `.github/workflows/preview-db.yml`** (Phase 2) — triggered on PRs labeled `preview-db`
  (and/or `paths: supabase/**`): wait for the Supabase branch, `supabase branches get -o env`,
  map to `VITE_SUPABASE_*`, `pnpm build`, `netlify deploy --alias=pr-<n>`. Disable Netlify's
  native deploy-preview build for these PRs.
- **New scheduled `preview-db-sweep`** (Phase 2) — orphan branch cleanup + cost logging.
- **`supabase-keepalive.yml`** — unchanged in Phase 1; candidate for removal once on Pro
  (Phase 2), since Pro projects don't free-tier-pause.
- **Supabase project settings (out-of-repo, documented in `.github/workflows/README.md`):**
  upgrade to Pro; enable the GitHub branching integration; set the Supabase directory; add
  `SUPABASE_ACCESS_TOKEN` scope for branch management (already present for link/reset).
- **`.github/workflows/README.md`** — document the new PR DB gate, the forward-only staging
  change + manual reset path, the `preview-db` label workflow, per-branch OAuth handling, and
  the cost model.

## 7. Migration & Seed Plan

- **Migrations stay append-only** (AGENTS.md §6). This PRD *reinforces* the rule by making
  `check-migration-order.sh` a **required PR check** rather than a local nicety. No existing
  migration is edited.
- **No new product migrations are required by this PRD** — it is CI/CD + config, not schema.
  (The buckets/policies it must *reproduce* come from the file-uploads PRD.)
- **Branch apply model:** preview branches apply migrations **forward** on create and on each
  push (Branching runs Clone → Pull → Health-check → Configure → Migrate → Seed → Deploy).
  This matches prod's forward-only model — a deliberate consistency win.
- **Seed strategy:**
  - Branches/previews **start empty** (no prod data is ever copied — privacy). `seed.sql` is
    applied automatically to preview branches. Our seed is already **PII-safe** (all
    `@example.com`) and seeds `auth.users` + `auth.identities`, so RLS/flows that need logged-in
    users work in previews.
  - Keep seed **small and correctness-focused**, not volume-realistic (Non-Goal). Ensure it is
    **idempotent** where it can be (it already uses `ON CONFLICT DO NOTHING` for flags) so
    re-seeds on branch push don't error.
  - **Storage buckets:** `supabase db diff` does **not** capture buckets, and a bucket created
    only by SQL in a migration may not reproduce cleanly in a branch. Declare buckets in
    `[storage.buckets]` in `config.toml` so they're provisioned per branch and synced on merge.
    Coordinate this with the file-uploads PRD (its bucket must show up in previews).
  - **Feature flags:** because `lib/featureFlags.tsx` falls back to `false` on missing rows, a
    preview branch that has run the flag's migration/seed will reflect the intended state; a
    shared-staging preview will show whatever staging has. Call this out in the preview banner.
- **Forward-only guarantee for prod is preserved and, ideally, made enforceable** — the PR
  drift/order gates prevent the class of change that would require a prod reset.

## 8. Rollout Plan

1. **Phase 1a — PR DB gate.** Add `db-validation` to `pr.yml` as non-blocking; confirm it
   passes on a few PRs and on `main`; then mark it **required**. (Zero cost; reversible.)
2. **Phase 1b — staging guardrail.** One deliberate `db reset` via the new manual dispatch to
   baseline staging; switch the automatic staging deploy to forward-only `migration up`;
   observe a few deploys retain data correctly.
3. **Phase 2a — enable Branching (Pro).** Upgrade to Pro, connect the GitHub integration on a
   throwaway PR; verify a branch provisions, migrations + seed apply, and creds are
   retrievable. Measure real provisioning time and per-branch cost.
4. **Phase 2b — preview wiring.** Land `preview-db.yml`; validate on a DB-changing PR that the
   Netlify preview talks to the **branch** DB (new table/flag visible) and that Google OAuth is
   handled (see Risks/Open Questions). Disable Netlify's staging-pointed preview build for
   labeled PRs.
5. **Phase 2c — lifecycle.** Confirm auto-delete on merge/close; land the orphan sweep; add cost
   logging. Retire `supabase-keepalive.yml`.
6. **Docs.** Update `.github/workflows/README.md` and the local runbook; announce the
   `preview-db` label convention.

## 9. Cost Estimate

| Item | Cost | Notes |
| --- | --- | --- |
| **Phase 1 (CI DB gate + guardrails)** | **~$0** | All ephemeral local containers in the Actions runner; no Supabase account use. |
| Supabase **Pro plan** (prereq for Branching) | **$25/mo** | Also removes free-tier pausing → lets us retire the keepalive workflow. |
| Per **preview branch** (Micro, short-lived) | **~$0.40** each (~30 h × $0.01344/h) | Compute credits **do not** apply to branches. |
| Monthly branch compute (est. ~15–20 DB PRs) | **~$6–8/mo** | Bounded by the `preview-db` gate; frontend-only PRs cost nothing extra. |
| Optional **persistent** QA branch (if adopted) | **~$9.70/mo** | 24/7 Micro; *not* recommended as the per-PR mechanism. |
| **Estimated steady-state** | **~$31–33/mo** | Pro + a handful of preview branches. Cheaper fallback (Phase 1 only): **~$0** beyond current. |

**Cheaper fallback if Pro/branching isn't justified:** ship **Phase 1 only**. PRs still get
migration/RLS/seed validation and drift detection, staging stops being wiped — the two
highest-severity problems solved for free — while previews remain frontend-only against
staging, documented as a known limitation.

## 10. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| **Google OAuth breaks in previews** — each branch has a distinct API URL, and Google requires exact-match redirect URIs, so sign-in fails in a per-branch preview. | Treat as an explicit Phase 2 sub-task: register preview redirect URIs, or provide a **magic-link / email-OTP** (Inbucket-style) auth path for previews, or seed a test session. Tracked as Open Question 1; do not ship Phase 2b claiming "full E2E" until auth in previews is decided. |
| **Cost creep from forgotten branches** | Label-gate provisioning; auto-delete on merge/close; scheduled orphan sweep that `log`s removals; alert if branch count/hours exceed a threshold. |
| **`supabase db diff` blind spots** (buckets, publications, `security_invoker` views) give false confidence | Document the allow-list in the gate; declare buckets in `[storage.buckets]`; don't treat a green diff as "schema fully reproduced." |
| **First forward-only staging deploy fails** because staging drifted under the old reset regime | Do one deliberate `db reset` via the manual dispatch to baseline staging before switching to forward-only. |
| **Provisioning latency** (branch cold-start ~minutes) slows labeled PRs | Acceptable because branching is opt-in; keep the fast free path for frontend-only PRs; surface branch status in the PR. |
| **Seeded auth users / RLS depends on seed** not matching a branch | Seed runs after migrations on each branch; keep seed idempotent; verify a seeded login works in a preview during Phase 2b. |
| **Service-role key leakage** into the client bundle | Only `ANON_KEY` → `VITE_*`; never map service-role into the build; scope secrets in Actions. |
| **CLI surface drift** (`supabase branches *` may still need `--experimental` on some CLI versions; exact `-o env` fields not fully documented) | Pin the CLI version; verify `supabase branches --help` and the `-o env` output empirically during Phase 2a before wiring. |
| **Two build paths diverge** (Netlify preview vs Actions preview) | Disable Netlify's native deploy-preview build for `preview-db` PRs so only the Actions-built, branch-pointed artifact is served. |
| **Migration ordering drift after rebase** | Now a **required** PR check via `check-migration-order.sh` (AGENTS.md §6). |

## 11. Open Questions

1. **Preview auth:** how do we handle Google OAuth per branch — pre-registered preview redirect
   URIs, a magic-link/OTP fallback for previews, or accept "no Google login in previews" and
   test via seeded sessions? (Blocks the "full E2E" claim of Phase 2b.)
2. **Gate trigger:** provision a branch on the `preview-db` **label**, automatically on
   `paths: supabase/**`, or both? (Affects cost and reviewer ergonomics.)
3. **Persistent QA branch:** is a single long-lived staging/QA branch worth ~$9.70/mo in
   addition to (or instead of) the current dedicated staging project? (Interacts with the
   forward-only staging change.)
4. **Pro justification:** is $25/mo Pro acceptable now, or do we ship **Phase 1 only** until DB
   PR volume justifies previews? (Phase 1 delivers most of the safety for ~$0.)
5. **Keepalive retirement:** once on Pro, confirm pausing is gone before deleting
   `supabase-keepalive.yml`.
6. **`db diff` engine:** adopt the newer `pg-delta` diff engine for the drift gate, or stay on
   the default `migra`? (Affects accuracy of the gate.)

## 12. Milestones

- **M1 — PR DB gate (Phase 1a):** `db-validation` job added and made required; migrations +
  seed + append-only + drift validated on every PR. *(No cost; biggest risk reduction.)*
- **M2 — Non-destructive staging (Phase 1b):** staging switched to forward-only `migration up`
  with a manual `db reset` dispatch; staging data survives deploys.
- **M3 — Branching enabled (Phase 2a):** Pro + GitHub integration; a branch provisions with
  migrations + seed; real provisioning time and cost measured; CLI surface verified.
- **M4 — Per-PR previews wired (Phase 2b):** labeled PRs get a preview pointed at their branch
  DB; new table/flag/bucket visible end-to-end; preview auth decision implemented.
- **M5 — Lifecycle + docs (Phase 2c):** auto-delete confirmed, orphan sweep + cost logging
  live, keepalive retired, `README.md` + runbook updated, `preview-db` convention announced.
