#!/bin/zsh
# Scheduled awareness refresh: fetch feeds + distill the daily briefing.
# Schedule on the dashboard host (Mac Studio), e.g. daily at 07:00, via launchd:
#
#   ~/Library/LaunchAgents/com.revivr.awareness-refresh.plist
#   <key>ProgramArguments</key>
#   <array><string>/bin/zsh</string><string>/path/to/vault-dashboard/scripts/awareness-refresh.sh</string></array>
#   <key>StartCalendarInterval</key>
#   <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
#
# then: launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.revivr.awareness-refresh.plist

DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3000}"

# Fall back to the runtime .env.local token when not provided in the
# environment — launchd runs this without the dashboard's env loaded.
if [ -z "$DASHBOARD_TOKEN" ]; then
  ENV_FILE="$HOME/Library/Application Support/Revivr/VaultDashboard/.env.local"
  DASHBOARD_TOKEN=$(grep '^DASHBOARD_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"'\''')
fi

AUTH_HEADER=()
if [ -n "$DASHBOARD_TOKEN" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $DASHBOARD_TOKEN")
fi

curl -sS -X POST "$DASHBOARD_URL/api/awareness/refresh" \
  -H 'Content-Type: application/json' \
  "${AUTH_HEADER[@]}" \
  -d '{"briefing": true}'
echo
