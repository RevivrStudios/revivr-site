#!/bin/zsh
# ─────────────────────────────────────────────────
# Vault Diagnostics Dashboard — Auto-Launch Script
# Starts the Next.js dev server bound to 0.0.0.0,
# enables Tailscale Serve for remote HTTPS access,
# then opens Safari to the local dashboard URL.
# ─────────────────────────────────────────────────

DASHBOARD_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000
URL="http://localhost:${PORT}"
LOG_FILE="$DASHBOARD_DIR/dashboard.log"

# Kill any existing dashboard process on this port
lsof -ti :${PORT} | xargs kill -9 2>/dev/null

# Build and start the production server bound to all interfaces (for Tailscale)
cd "$DASHBOARD_DIR" || exit 1
npm run build > "$LOG_FILE" 2>&1
npm start -- -H 0.0.0.0 >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "Starting Vault Diagnostics (PID: $SERVER_PID)..."

# Wait up to 15 seconds for the server to respond
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null | grep -q "200"; then
    echo "Dashboard is live at $URL"

    # Enable Tailscale Serve for remote HTTPS access
    if [ -x /usr/local/bin/tailscale ]; then
      TAILSCALE_READY=false
      for j in {1..20}; do
        if /usr/local/bin/tailscale status >/dev/null 2>&1; then
          TAILSCALE_READY=true
          break
        fi
        sleep 0.5
      done

      if [ "$TAILSCALE_READY" = true ]; then
        /usr/local/bin/tailscale serve --bg 3000 >> "$LOG_FILE" 2>&1
        echo "Tailscale Serve enabled — remote access via this machine's ts.net hostname (tailscale status)"
      else
        osascript -e 'display notification "Tailscale is not running. Remote dashboard access is unavailable." with title "Vault Diagnostics" subtitle "VPN Offline" sound name "Basso"'
        echo "Tailscale Serve failed to start (daemon not running). Notification sent."
      fi
    fi

    open -a Safari "$URL"
    wait $SERVER_PID
  fi
  sleep 0.5
done

echo "Warning: Dashboard did not respond within 15 seconds. Check $LOG_FILE"
exit 1
