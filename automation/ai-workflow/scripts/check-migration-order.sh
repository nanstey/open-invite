#!/usr/bin/env bash
set -euo pipefail

# Validate migration safety for current branch.
# Rules:
# 1) Branch migration files must remain the final migration(s) in sorted order.
# 2) If an existing migration is modified, it must be renamed to a newer timestamp
#    (in-place edits to old timestamped migrations are rejected).

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

BASE_REF="${BASE_REF:-origin/main}"

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "[ai-dev-workflow] migration-check: base ref '$BASE_REF' not found; skipping strict migration checks"
  exit 0
fi

merge_base="$(git merge-base HEAD "$BASE_REF")"

mapfile -t changed_lines < <(git diff --name-status "$merge_base"...HEAD -- 'supabase/migrations/*.sql' || true)
if [[ ${#changed_lines[@]} -eq 0 ]]; then
  echo "[ai-dev-workflow] migration-check: no migration changes"
  exit 0
fi

# Build changed and unchanged timestamp sets from current tree.
mapfile -t all_migrations < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f
' | sort)

extract_ts() {
  local f="$1"
  if [[ "$f" =~ ^([0-9]{14})_.*\.sql$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ""
  fi
}

declare -A changed_map=()
for line in "${changed_lines[@]}"; do
  # statuses: M	path, A	path, D	path, R100	old	new
  status="${line%%$'\t'*}"
  rest="${line#*$'\t'}"

  if [[ "$status" =~ ^R ]]; then
    old_path="${rest%%$'\t'*}"
    new_path="${rest#*$'\t'}"
    new_base="$(basename "$new_path")"
    changed_map["$new_base"]=1
  else
    path="$rest"
    base="$(basename "$path")"
    changed_map["$base"]=1
  fi

done

max_unchanged_ts=""
min_changed_ts=""

for f in "${all_migrations[@]}"; do
  ts="$(extract_ts "$f")"
  if [[ -z "$ts" ]]; then
    continue
  fi

  if [[ -n "${changed_map[$f]:-}" ]]; then
    if [[ -z "$min_changed_ts" || "$ts" < "$min_changed_ts" ]]; then
      min_changed_ts="$ts"
    fi
  else
    if [[ -z "$max_unchanged_ts" || "$ts" > "$max_unchanged_ts" ]]; then
      max_unchanged_ts="$ts"
    fi
  fi

done

if [[ -n "$min_changed_ts" && -n "$max_unchanged_ts" && "$min_changed_ts" < "$max_unchanged_ts" ]]; then
  echo "[ai-dev-workflow] migration-check FAILED: changed migration timestamp ($min_changed_ts) is older than existing latest unchanged migration ($max_unchanged_ts)."
  echo "Action: rename migration(s) to newer timestamp(s) so branch migrations are final in order."
  exit 1
fi

# Reject in-place edits of existing migration files from base.
for line in "${changed_lines[@]}"; do
  status="${line%%$'\t'*}"
  rest="${line#*$'\t'}"

  if [[ "$status" == "M" ]]; then
    path="$rest"
    if git cat-file -e "$merge_base:$path" 2>/dev/null; then
      echo "[ai-dev-workflow] migration-check FAILED: existing migration modified in place: $path"
      echo "Action: create/rename to a new timestamped migration file >= latest migration timestamp."
      exit 1
    fi
  fi

done

echo "[ai-dev-workflow] migration-check passed"
