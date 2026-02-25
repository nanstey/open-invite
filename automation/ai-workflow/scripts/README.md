# AI Dev Workflow Scripts (Bootstrap)

## Safe GitHub comment utility

Always pass markdown via `--body-file`.

```bash
cat <<'EOF' > /tmp/review-summary.md
## Review batch
- Addressed all requested updates in one push
EOF

automation/ai-workflow/scripts/lib/github-comment-safe.sh 123 /tmp/review-summary.md
```

This avoids shell interpolation issues with backticks, `$`, and multiline markdown.

## Change detection loop

Run manually:

```bash
corepack pnpm ai-workflow:loop
```

Quick local validation chain (context-aware reset logic):

```bash
corepack pnpm ai-workflow:validate-local
# skip supabase lifecycle if already running
SKIP_SUPABASE=1 corepack pnpm ai-workflow:validate-local
# force reset (override auto-detection)
FORCE_SUPABASE_RESET=1 corepack pnpm ai-workflow:validate-local
```

Reset behavior:
- reset when `supabase/migrations/**` or `supabase/seed.sql` changed vs merge-base (`origin/main` by default)
- otherwise run forward migration only (`supabase:migrate`)

Migration safety check:
```bash
corepack pnpm ai-workflow:check-migrations
```
Rules enforced:
- changed migration files must remain final/latest in ordering
- in-place edits to historical migration files are rejected

Create branch-isolated worktrees quickly:

```bash
automation/ai-workflow/scripts/setup-worktree.sh ci/ai-dev-workflow
automation/ai-workflow/scripts/setup-worktree.sh feat/groups ../wt-feat-groups
```

Behavior in bootstrap phase:

- checks eligible `on_deck` projects only,
- checks new PR comments for tracked proposal/implementation PRs,
- checks newly failed GitHub Actions workflow runs since last checkpoint,
- when CI failures are found, auto-runs remediation command if configured,
- exits with no-op when there are no changes,
- only notifies on errors (notification wiring TODO).

### CI auto-remediation (default, no extra wiring)

By default, the loop runs:
- `node automation/ai-workflow/scripts/ci-remediate.mjs`

Concurrency safety:
- acquires a per-branch lock at `.ai-dev-workflow/locks/<branch>.lock.json`
- refuses to run if another active loop already holds that branch lock
- automatically reclaims stale locks older than `AI_DEV_WORKFLOW_LOCK_TTL_MINUTES` (default 120)
- releases lock on completion/failure (finally block)

Stop-loss safety:
- tracks consecutive remediation failures per branch in `.ai-dev-workflow/failure-ledger.json`
- when failures exceed `AI_DEV_WORKFLOW_REMEDIATION_FAILURE_LIMIT` (default 2), mutation is halted and review-only behavior is forced

This script will:
- scope failures to the current branch,
- run `pnpm lint:fix` + `pnpm format`,
- run `pnpm lint` + `pnpm test` + `pnpm build`,
- commit and push fixes if any files changed.

Override hook (optional):
- `AI_DEV_WORKFLOW_CI_REMEDIATION_CMD`: custom shell command to execute on new CI failures.
- `AI_DEV_WORKFLOW_AUTO_FIX_ALL_BRANCHES=1`: allow remediation for failures on branches other than current checkout.

Environment passed to remediation command:
- `AI_DEV_WORKFLOW_FAILED_RUNS_FILE`
- `AI_DEV_WORKFLOW_FAILED_RUNS_JSON`
- `AI_DEV_WORKFLOW_CURRENT_BRANCH`
- `GH_REPO`

Autonomy override flags:
- `PAUSE_AUTONOMY=1` -> no mutations (detection only)
- `REVIEW_ONLY_MODE=1` -> no mutations, summarize/detect only
- `NO_COMMIT_MODE=1` -> run remediation steps but do not commit/push
