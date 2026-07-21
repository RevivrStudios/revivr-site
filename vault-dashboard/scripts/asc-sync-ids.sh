#!/bin/zsh
# Weekly App Store Connect reconcile. Two read-only asc syncs:
#  1. /api/marketing/apps/sync-ids  — app_store_id into each app-profile.md (D1)
#  2. /api/renewals/sync-asc        — certs + profiles into RENEWALS.md (D2)
# Installed as LaunchAgent com.revivr.asc-sync-ids (see the .plist alongside).
set -u
ENV="$HOME/Library/Application Support/Revivr/VaultDashboard/.env.local"
TOKEN=$(grep '^DASHBOARD_TOKEN=' "$ENV" 2>/dev/null | cut -d= -f2- | tr -d '"'\''')
auth=()
[[ -n "$TOKEN" ]] && auth=(-H "Authorization: Bearer $TOKEN")

echo "[asc-sync ids]"
curl -s --max-time 120 -X POST "${auth[@]}" http://localhost:3000/api/marketing/apps/sync-ids
echo
echo "[asc-sync renewals]"
curl -s --max-time 120 -X POST "${auth[@]}" http://localhost:3000/api/renewals/sync-asc
echo
