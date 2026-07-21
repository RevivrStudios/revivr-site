#!/bin/zsh
# Periodic reconcile of the Operating Board's dashboard-blockers block.
# The Problems API already mirrors on every ticket mutation; this is a
# backstop for tickets edited directly in data/problems/ or a missed sync.
# Installed as LaunchAgent com.revivr.problems-board-sync (see the .plist
# alongside this script). Idempotent — writes only when something changed.
set -u
ENV="$HOME/Library/Application Support/Revivr/VaultDashboard/.env.local"
TOKEN=$(grep '^DASHBOARD_TOKEN=' "$ENV" 2>/dev/null | cut -d= -f2- | tr -d '"'\''')
auth=()
[[ -n "$TOKEN" ]] && auth=(-H "Authorization: Bearer $TOKEN")
curl -s --max-time 30 -X POST "${auth[@]}" http://localhost:3000/api/problems/sync
echo   # newline after the JSON response for readable logs
