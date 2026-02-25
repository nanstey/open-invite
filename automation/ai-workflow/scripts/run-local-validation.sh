#!/usr/bin/env bash
set -euo pipefail

# Context-aware local validation chain for current worktree/branch.
# Usage:
#   automation/ai-workflow/scripts/run-local-validation.sh
#
# Env:
#   SKIP_SUPABASE=1        -> skip all supabase lifecycle actions
#   BASE_REF=origin/main   -> diff base for change detection
#   FORCE_SUPABASE_RESET=1 -> always reset before validation

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

BASE_REF="${BASE_REF:-origin/main}"
FORCE_SUPABASE_RESET="${FORCE_SUPABASE_RESET:-0}"
SKIP_SUPABASE="${SKIP_SUPABASE:-0}"

needs_reset=0
schema_or_seed_changed=0

# Compute migration/seed changes against merge-base with BASE_REF when possible.
if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  merge_base="$(git merge-base HEAD "$BASE_REF")"
  changed_files="$(git diff --name-only "$merge_base"...HEAD)"
else
  # Fallback: only local uncommitted/staged changes.
  changed_files="$(git diff --name-only HEAD || true)"
fi

if echo "$changed_files" | grep -Eq '^supabase/migrations/|^supabase/seed\.sql$'; then
  schema_or_seed_changed=1
fi

if [[ "$FORCE_SUPABASE_RESET" == "1" ]]; then
  needs_reset=1
elif [[ "$schema_or_seed_changed" == "1" ]]; then
  needs_reset=1
fi

# Migration safety guardrails
bash automation/ai-workflow/scripts/check-migration-order.sh

if [[ "$SKIP_SUPABASE" != "1" ]]; then
  corepack pnpm supabase:start

  if [[ "$needs_reset" == "1" ]]; then
    echo "[ai-dev-workflow] Supabase reset required (migration/seed changed or forced)"
    corepack pnpm supabase:reset
  else
    echo "[ai-dev-workflow] Supabase reset not required; applying forward migrations"
    corepack pnpm supabase:migrate
  fi
fi

corepack pnpm lint
corepack pnpm types
corepack pnpm test
corepack pnpm build

if [[ "$SKIP_SUPABASE" != "1" ]]; then
  corepack pnpm supabase:stop
fi

echo "[ai-dev-workflow] local validation chain complete"
