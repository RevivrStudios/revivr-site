#!/bin/zsh
# ─────────────────────────────────────────────────────────────
# Sprint Detection Monitor
# Checks the Obsidian vault's git log for recent commit activity.
# If it detects a "sprint" (N+ commits in the last window), it
# sends a macOS notification suggesting Post-Sprint Extraction.
# ─────────────────────────────────────────────────────────────

# ── Configuration ────────────────────────────────────────────
VAULT_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev"
COMMIT_THRESHOLD=5        # Number of commits that constitutes a "sprint"
HOURS_WINDOW=8            # Look back this many hours
STATE_FILE="$HOME/.gemini/antigravity/mcp/vault-dashboard/.sprint-notified"
DASHBOARD_URL="http://localhost:3000"
COOLDOWN_HOURS=12         # Don't re-notify within this window

# ── Guard: Don't notify too frequently ───────────────────────
if [[ -f "$STATE_FILE" ]]; then
    last_notified=$(cat "$STATE_FILE")
    now=$(date +%s)
    elapsed=$(( (now - last_notified) / 3600 ))
    if (( elapsed < COOLDOWN_HOURS )); then
        exit 0
    fi
fi

# ── Count recent vault commits ───────────────────────────────
cd "$VAULT_DIR" || exit 1

since_time=$(date -v-${HOURS_WINDOW}H +"%Y-%m-%dT%H:%M:%S")
commit_count=$(git log --oneline --since="$since_time" 2>/dev/null | wc -l | tr -d ' ')

if (( commit_count < COMMIT_THRESHOLD )); then
    exit 0
fi

# ── Also check Xcode project directories for activity ────────
xcode_commits=0
for project_dir in /Volumes/Unreal\ Drive/AppleDeveloper/Xcode_Projects/*/; do
    if [[ -d "${project_dir}.git" ]]; then
        cd "$project_dir" 2>/dev/null || continue
        count=$(git log --oneline --since="$since_time" 2>/dev/null | wc -l | tr -d ' ')
        xcode_commits=$((xcode_commits + count))
    fi
done

total_commits=$((commit_count + xcode_commits))

# ── Get latest commit message for context ────────────────────
cd "$VAULT_DIR" || exit 1
latest_msg=$(git log --oneline -1 2>/dev/null | cut -c 9-)

# ── Send macOS Notification ──────────────────────────────────
osascript -e "
display notification \"${total_commits} commits detected in the last ${HOURS_WINDOW}h. Latest: ${latest_msg}. Click the 🧬 Post-Sprint Extraction button on the dashboard.\" \
    with title \"🧬 Sprint Detected — Time for Extraction\" \
    subtitle \"Vault has ${commit_count} new commits, projects have ${xcode_commits}\" \
    sound name \"Glass\"
"

# ── Open dashboard if not already visible ────────────────────
# Only opens if Safari isn't already showing it
open "$DASHBOARD_URL" 2>/dev/null

# ── Record notification timestamp ────────────────────────────
mkdir -p "$(dirname "$STATE_FILE")"
date +%s > "$STATE_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sprint detected: ${total_commits} total commits (vault: ${commit_count}, projects: ${xcode_commits}). Notification sent."
