# AI Dev Workflow Scripts (Bootstrap)

## Safe GitHub comment utility

Always pass markdown via `--body-file`.

```bash
cat <<'EOF' > /tmp/review-summary.md
## Review batch
- Addressed all requested updates in one push
EOF

scripts/ai-dev-workflow/lib/github-comment-safe.sh 123 /tmp/review-summary.md
```

This avoids shell interpolation issues with backticks, `$`, and multiline markdown.

## Change detection loop

Run manually:

```bash
corepack pnpm ai-workflow:loop
```

Create branch-isolated worktrees quickly:

```bash
scripts/ai-dev-workflow/setup-worktree.sh ci/ai-dev-workflow
scripts/ai-dev-workflow/setup-worktree.sh feat/groups ../wt-feat-groups
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
- `node scripts/ai-dev-workflow/ci-remediate.mjs`

Concurrency safety:
- acquires a per-branch lock at `.ai-dev-workflow/locks/<branch>.lock.json`
- refuses to run if another active loop already holds that branch lock
- releases lock on completion/failure (finally block)

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
