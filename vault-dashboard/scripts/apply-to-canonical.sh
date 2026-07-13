#!/bin/zsh
# Apply this git checkout's dashboard source to the CANONICAL source folder
# (the iCloud-synced Obsidian location that deploy-dashboard.sh reads from).
#
# Usage, on any Mac with the vault synced (run from vault-dashboard/ in the
# git checkout):
#
#   ./scripts/apply-to-canonical.sh
#
# What it does:
#   1. Backs up the canonical folder (sources only — no node_modules/.next)
#      to a timestamped sibling folder, so nothing is ever lost.
#   2. Rsyncs this checkout's source over the canonical folder. It never
#      deletes files that exist only in canonical, and never touches
#      deploy-dashboard.sh, .env files, or runtime data/ state.
#   3. Reminds you to review and then deploy with ./deploy-dashboard.sh
#      (which only runs on Mac Studio).
#
# Editing the canonical folder does nothing by itself — deploy-dashboard.sh
# is what copies it to the runtime, rebuilds, and restarts the server.

set -euo pipefail

CANONICAL_DIR="${CANONICAL_DIR:-${1:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard}}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$CANONICAL_DIR" ]; then
  echo "Canonical folder not found: $CANONICAL_DIR"
  echo "Is the Obsidian vault synced on this Mac? (Override with CANONICAL_DIR=... or pass the path as \$1.)"
  exit 1
fi
if [ ! -f "$SRC_DIR/package.json" ] || [ ! -d "$SRC_DIR/app" ]; then
  echo "This script must live inside the vault-dashboard git checkout (package.json/app not found in $SRC_DIR)."
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${CANONICAL_DIR%/}.backup-$STAMP"

echo "1/3 Backing up canonical source to: $BACKUP_DIR"
rsync -a \
  --exclude 'node_modules/' \
  --exclude '.next*/' \
  --exclude '.git/' \
  "$CANONICAL_DIR/" "$BACKUP_DIR/"

echo "2/3 Applying update from: $SRC_DIR"
rsync -av \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next*/' \
  --exclude '.env*' \
  --exclude 'deploy-dashboard.sh' \
  --exclude 'data/assistant/' \
  --exclude 'data/problems/' \
  --exclude 'data/awareness/' \
  --exclude 'data/status/' \
  --exclude 'data/logs/' \
  --exclude 'data/marketing/' \
  --exclude 'data/resources/' \
  "$SRC_DIR/" "$CANONICAL_DIR/"

echo "3/3 Done. Next steps:"
echo "  - Review what changed vs the backup if you had local edits:"
echo "      diff -rq '$BACKUP_DIR' '$CANONICAL_DIR' | grep -v node_modules"
echo "  - New env vars are documented in .env.example (ANTHROPIC_API_KEY, DASHBOARD_TOKEN, ...);"
echo "    add them wherever deploy-dashboard.sh provisions the runtime's .env.local."
echo "  - Deploy (Mac Studio only):"
echo "      cd '$CANONICAL_DIR' && ./deploy-dashboard.sh"
