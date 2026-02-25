#!/usr/bin/env bash
set -euo pipefail

# Quickstart local validation chain for current worktree/branch.
# Usage:
#   automation/ai-workflow/scripts/run-local-validation.sh
#
# Env:
#   SKIP_SUPABASE=1  -> skip supabase start/migrate/stop

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "${SKIP_SUPABASE:-0}" != "1" ]]; then
  corepack pnpm supabase:start
  corepack pnpm supabase:migrate
fi

corepack pnpm lint
corepack pnpm test
corepack pnpm build

if [[ "${SKIP_SUPABASE:-0}" != "1" ]]; then
  corepack pnpm supabase:stop
fi

echo "[ai-dev-workflow] local validation chain complete"
