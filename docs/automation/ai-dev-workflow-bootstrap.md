# AI Dev Workflow Bootstrap (Phase 1)

This doc bootstraps implementation from RFC `docs/projects/2026-02-23_ai-dev-workflow.md`.

## Scope of this bootstrap PR

- Adds a skeleton 30-minute change-detection loop entrypoint.
- Documents safe GitHub comment posting (`gh ... --body-file`) to avoid shell interpolation issues.
- Adds status sync/event mapping scaffold for coordinator implementation.
- Adds PR template requirements so implementation PRs include `Proposal Ref:`.
- Leaves explicit TODOs for credentials and Telegram wiring.

## New entrypoint

- Script: `scripts/ai-dev-workflow/change-detection-loop.mjs`
- NPM script: `pnpm ai-workflow:loop`

### Current behavior (intentional skeleton)

1. Load latest project snapshot from `OPEN_INVITE_ON_DECK_CMD` (optional provider command).
2. Keep only projects with `status === "on_deck"`.
3. Check for new PR comments on proposal/implementation PRs tied to those `on_deck` projects.
4. If there are no detected changes, exit silently with no-op log.
5. If changes are detected, write checkpoint state and emit a bootstrap log (no worker spawn yet).
6. Notify only on error via `notifyError(...)`.

## Required environment hooks (bootstrap)

- `OPEN_INVITE_ON_DECK_CMD` (optional): shell command returning JSON array of project snapshots.
- `GH_REPO` (optional): `owner/repo` for PR comment checks.
- `AI_DEV_WORKFLOW_STATE_PATH` (optional): path for loop checkpoint state.

### TODO: credentials wiring

- TODO: wire service credentials for production-safe project polling.
- TODO: wire GitHub App auth/token strategy for non-interactive `gh api` calls.
- TODO: wire Telegram credentials (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) once approved.

## Safe GitHub comment posting pattern

Use `gh pr comment --body-file` (never inline shell-expanded markdown for automation output).

```bash
cat <<'EOF' > /tmp/pr-comment.md
## Batch update summary
- Applied requested changes
- Remaining follow-ups captured
EOF

gh pr comment 123 --body-file /tmp/pr-comment.md
```

Reference helper: `scripts/ai-dev-workflow/lib/github-comment-safe.sh`.
