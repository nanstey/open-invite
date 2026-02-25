# Open Invite AI Workflow (Automation)

This folder is the self-contained operational source for agent automation behavior.

## Read order (authoritative)
1. `01-policy.md` — normative rules (what must be true)
2. `02-cycle-checklist.md` — per-cycle execution (what to do)
3. `03-openclaw-operations.md` — runtime/cron orchestration
4. `04-autonomy-guardrails.md` — hard limits and override controls

## Supporting docs
- `05-quality-review-jobs.md` — recurring deep-pass review jobs
- `runbooks/supabase-local.md` — local DB validation procedure
- `runbooks/browser-validation.md` — browser validation procedure
- `runbooks/status-event-map.md` — event/status implementation map
- `bootstrap.md` — historical bootstrap notes and rollout TODOs
- `scripts/` — executable helpers (loop/remediation/migration checks/worktrees)

## Intent boundaries
- Policy and guardrails are canonical.
- Runbooks define conditional procedures.
- Scripts implement behavior and must remain aligned with policy.

## Proposal vs Automation
Project proposal docs may evolve independently.
Automation follows this folder's policy/contracts even if proposal docs drift.
