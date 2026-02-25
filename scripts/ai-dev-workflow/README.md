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
pnpm ai-workflow:loop
```

Behavior in bootstrap phase:

- checks eligible `on_deck` projects only,
- checks new PR comments for tracked proposal/implementation PRs,
- checks newly failed GitHub Actions workflow runs since last checkpoint,
- when CI failures are found, auto-runs remediation command if configured,
- exits with no-op when there are no changes,
- only notifies on errors (notification wiring TODO).

### Optional CI auto-remediation hooks

- `AI_DEV_WORKFLOW_CI_REMEDIATION_CMD`: shell command to execute when new CI failures are detected.
- `AI_DEV_WORKFLOW_AUTO_FIX_ALL_BRANCHES=1`: allow remediation for failures on branches other than current checkout.

Environment passed to remediation command:
- `AI_DEV_WORKFLOW_FAILED_RUNS_FILE`
- `AI_DEV_WORKFLOW_FAILED_RUNS_JSON`
- `AI_DEV_WORKFLOW_CURRENT_BRANCH`
- `GH_REPO`
