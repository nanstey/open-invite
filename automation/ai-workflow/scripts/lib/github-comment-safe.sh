#!/usr/bin/env bash
set -euo pipefail

# Safe wrapper for GitHub PR comments.
# Usage: automation/ai-workflow/scripts/lib/github-comment-safe.sh <pr-number> <markdown-file>

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <pr-number> <markdown-file>" >&2
  exit 2
fi

pr_number="$1"
body_file="$2"

if [[ ! -f "$body_file" ]]; then
  echo "body file not found: $body_file" >&2
  exit 2
fi

gh pr comment "$pr_number" --body-file "$body_file"
