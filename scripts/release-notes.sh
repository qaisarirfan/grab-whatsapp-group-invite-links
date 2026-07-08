#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="${1:-release-notes.txt}"
GIT_RANGE="${2:-}"

PROJECT_NAME="Grab WhatsApp Group Invite Links"

if [[ -n "$GIT_RANGE" ]]; then
  LOG_RANGE="$GIT_RANGE"
elif LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null)"; then
  LOG_RANGE="${LAST_TAG}..HEAD"
else
  LOG_RANGE="--all"
fi

NOTES="$(
  git log $LOG_RANGE \
    --date=short \
    --pretty=format:'%ad%x1f%h%x1f%B%x1e' \
  | awk -v RS='\x1e' -F'\x1f' '
      {
        date = $1
        hash = $2
        msg = $3

        if (date != current_date) {
          if (current_date != "") print ""
          current_date = date
          print date
        }

        # Split message into lines
        n = split(msg, lines, "\n")

        # First line
        printf "- %s (%s)\n", lines[1], hash

        # Remaining lines (body)
        for (i = 2; i <= n; i++) {
          if (length(lines[i]) > 0)
            printf "  %s\n", lines[i]
        }
      }
    '
)"

if [[ -z "$NOTES" ]]; then
  NOTES="- Maintenance release"
fi

{
  echo "$PROJECT_NAME"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M %Z')"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo
  echo "Changes:"
  echo "$NOTES"
} > "$OUT_FILE"

echo "Release notes written to $OUT_FILE"