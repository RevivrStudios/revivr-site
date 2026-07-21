#!/bin/bash
# fleet-remote-scan.sh — runs ON a remote machine (piped in over `ssh … bash -s`).
# Scans that machine's Claude Code session store and emits one session board
# block per active session to stdout. Pure bash + grep (remotes have no node).
#
# Usage (env vars, so a machine name with spaces survives SSH arg-splitting):
#   ssh host "MACHINE='Mac Core' WINDOW_MIN=1440 bash -s" < fleet-remote-scan.sh
# Output: repeated blocks, each:
#   ###SESSION### <machine-slug>.md
#   ---
#   <yaml frontmatter>
#   ---
# The collector on Mac Studio splits on ###SESSION### and writes the files.

MACHINE="${MACHINE:-$(scutil --get ComputerName 2>/dev/null || hostname)}"
WINDOW_MIN="${WINDOW_MIN:-1440}"
CLAUDE_DIR="$HOME/.claude/projects"
CODEX_DIR="$HOME/.codex/sessions"
NOW=$(date +%s)
WINDOW=$((WINDOW_MIN * 60))

# Sanitize a value for a single-line quoted YAML scalar.
san() { printf '%s' "$1" | tr -d '"' | tr '\n\r' '  ' | sed 's/[[:space:]]*$//'; }

# Emit one session block from an already-extracted set of fields.
emit() {
  local sw="$1" project="$2" cwd="$3" branch="$4" sid="$5" first_ep="$6" mtime="$7"
  local commit="" commit_msg="" commit_epoch=""
  if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
    local line; line="$(git -C "$cwd" log -1 --format='%h%x1f%s%x1f%ct' 2>/dev/null)"
    commit="${line%%$'\x1f'*}"; local rest="${line#*$'\x1f'}"
    commit_msg="${rest%%$'\x1f'*}"; commit_epoch="${rest##*$'\x1f'}"
  fi
  echo "###SESSION### $(slugify "$MACHINE")-$sw-$(slugify "$project")-${sid:0:8}.md"
  echo "---"
  echo "machine: $(san "$MACHINE")"
  echo "slug: ${sid:0:8}"
  echo "software: $sw"
  echo "repo: $(san "$cwd")"
  echo "branch: $(san "$branch")"
  echo "status: active"
  echo "commit: $(san "$commit")"
  echo "commit_msg: \"$(san "$commit_msg")\""
  [ -n "$commit_epoch" ] && echo "commit_epoch: $commit_epoch"
  [ -n "$first_ep" ] && echo "started_epoch: $first_ep"
  echo "heartbeat_epoch: $mtime"
  echo "---"
}

# ISO-8601 (…Z / fractional) → epoch seconds, or empty on failure.
iso_epoch() {
  local ts="${1%%.*}"; ts="${ts%Z}"
  [ -z "$ts" ] && return 0
  date -u -j -f "%Y-%m-%dT%H:%M:%S" "$ts" +%s 2>/dev/null
}

slugify() { printf '%s' "$1" | tr '[:upper:] /' '[:lower:]--' | tr -cd 'a-z0-9-' ; }

# ── Claude Code: ~/.claude/projects/<enc>/<id>.jsonl (cwd on message lines) ──
if [ -d "$CLAUDE_DIR" ]; then
  for dir in "$CLAUDE_DIR"/*/; do
    [ -d "$dir" ] || continue
    latest="$(ls -t "$dir"*.jsonl 2>/dev/null | head -1)"
    [ -z "$latest" ] && continue
    mtime=$(stat -f %m "$latest" 2>/dev/null) || continue
    [ $((NOW - mtime)) -gt "$WINDOW" ] && continue

    head_bytes="$(head -c 65536 "$latest")"
    cwd="$(printf '%s' "$head_bytes" | grep -m1 -o '"cwd":"[^"]*"' | sed 's/"cwd":"//; s/"$//')"
    branch="$(printf '%s' "$head_bytes" | grep -m1 -o '"gitBranch":"[^"]*"' | sed 's/"gitBranch":"//; s/"$//')"
    [ "$branch" = "HEAD" ] && branch=""
    first_ep="$(iso_epoch "$(printf '%s' "$head_bytes" | grep -m1 -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"//; s/"$//')")"
    project="$(basename "$cwd" 2>/dev/null)"; [ -z "$project" ] && project="$(basename "$dir")"
    emit "claude" "$project" "$cwd" "$branch" "$(basename "$latest" .jsonl)" "$first_ep" "$mtime"
  done
fi

# ── Codex: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl (cwd+git in meta) ──
if [ -d "$CODEX_DIR" ]; then
  # -mtime -N days = ceil(window minutes / 1440)
  days=$(( (WINDOW_MIN + 1439) / 1440 ))
  while IFS= read -r latest; do
    [ -z "$latest" ] && continue
    mtime=$(stat -f %m "$latest" 2>/dev/null) || continue
    [ $((NOW - mtime)) -gt "$WINDOW" ] && continue

    first_line="$(head -1 "$latest")"
    cwd="$(printf '%s' "$first_line" | grep -m1 -o '"cwd":"[^"]*"' | sed 's/"cwd":"//; s/"$//')"
    [ -z "$cwd" ] && continue
    branch="$(printf '%s' "$first_line" | grep -m1 -o '"branch":"[^"]*"' | sed 's/"branch":"//; s/"$//')"
    [ "$branch" = "HEAD" ] && branch=""
    first_ep="$(iso_epoch "$(printf '%s' "$first_line" | grep -m1 -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"//; s/"$//')")"
    sid="$(basename "$latest" .jsonl | sed 's/^rollout-[0-9T-]*-//')"
    emit "codex" "$(basename "$cwd")" "$cwd" "$branch" "$sid" "$first_ep" "$mtime"
  done < <(find "$CODEX_DIR" -name 'rollout-*.jsonl' -type f -mtime -"$days" 2>/dev/null)
fi
