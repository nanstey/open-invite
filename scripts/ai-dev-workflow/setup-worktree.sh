#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/ai-dev-workflow/setup-worktree.sh <branch> [worktree-path]
#
# Examples:
#   scripts/ai-dev-workflow/setup-worktree.sh ci/ai-dev-workflow
#   scripts/ai-dev-workflow/setup-worktree.sh feat/groups ../wt-feat-groups

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <branch> [worktree-path]" >&2
  exit 2
fi

branch="$1"
repo_root="$(git rev-parse --show-toplevel)"
default_path="${repo_root}/../wt-$(echo "$branch" | sed 's#[^a-zA-Z0-9._-]#-#g')"
worktree_path="${2:-$default_path}"

cd "$repo_root"

echo "[ai-dev-workflow] repo: $repo_root"
echo "[ai-dev-workflow] branch: $branch"
echo "[ai-dev-workflow] worktree: $worktree_path"

# Ensure we have latest refs
if git show-ref --verify --quiet "refs/heads/$branch"; then
  local_exists=1
else
  local_exists=0
fi

remote_ref="origin/$branch"
if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  remote_exists=1
else
  remote_exists=0
fi

if [[ $local_exists -eq 1 ]]; then
  if [[ -d "$worktree_path/.git" || -f "$worktree_path/.git" ]]; then
    echo "[ai-dev-workflow] worktree already exists at $worktree_path"
  else
    git worktree add "$worktree_path" "$branch"
  fi
elif [[ $remote_exists -eq 1 ]]; then
  if [[ -d "$worktree_path/.git" || -f "$worktree_path/.git" ]]; then
    echo "[ai-dev-workflow] worktree already exists at $worktree_path"
  else
    git fetch origin "$branch"
    git worktree add -b "$branch" "$worktree_path" "$remote_ref"
  fi
else
  # Create new branch from current HEAD
  if [[ -d "$worktree_path/.git" || -f "$worktree_path/.git" ]]; then
    echo "[ai-dev-workflow] worktree already exists at $worktree_path"
  else
    git worktree add -b "$branch" "$worktree_path" HEAD
  fi
fi

cat <<EOF

[ai-dev-workflow] worktree ready
- path: $worktree_path
- branch: $branch

Next steps:
1) cd "$worktree_path"
2) run loop manually: corepack pnpm ai-workflow:loop
3) or let OpenClaw cron target this worktree context
EOF
