#!/bin/zsh
# One-command setup for the dashboard's Assistant + auth on the serve Mac.
#
#   ./scripts/setup-dashboard-env.sh [runtime-dir]
#
# Does everything that can be automated on this machine:
#   1. Locates the runtime folder the LaunchAgent serves from (or takes it as $1).
#   2. Prompts for your Anthropic API key (input hidden, never echoed).
#   3. Generates a strong DASHBOARD_TOKEN.
#   4. Writes .env.local into the runtime folder (backs up any existing one),
#      and keeps a master copy at ~/.revivr-dashboard.env (outside iCloud)
#      so a wiping deploy can restore it.
#   5. Restarts the LaunchAgent and verifies the server responds.

set -euo pipefail

SERVICE="com.revivr.vault-dashboard"
MASTER_ENV="$HOME/.revivr-dashboard.env"

# ── 1. Find the runtime dir ─────────────────────────────────────
RUNTIME_DIR="${1:-}"
if [ -z "$RUNTIME_DIR" ] && command -v launchctl > /dev/null; then
  RUNTIME_DIR="$(launchctl print "gui/$(id -u)/$SERVICE" 2>/dev/null \
    | awk -F'= ' '/working directory/ {print $2; exit}' || true)"
fi
if [ -z "$RUNTIME_DIR" ] || [ ! -f "$RUNTIME_DIR/package.json" ]; then
  echo "Could not auto-detect the runtime folder (where the dashboard actually runs)."
  echo "Pass it explicitly:  ./scripts/setup-dashboard-env.sh /path/to/runtime"
  echo "Hint: grep the copy destination out of deploy-dashboard.sh."
  exit 1
fi
echo "Runtime folder: $RUNTIME_DIR"

# ── 2. Collect values ───────────────────────────────────────────
# No blind typing: copy the key in your browser (console.anthropic.com →
# API Keys → Copy), then just press Enter — the script reads the clipboard.
API_KEY="${ANTHROPIC_API_KEY:-}"
if [ -z "$API_KEY" ]; then
  printf "Copy your Anthropic API key to the clipboard now, then press Enter\n(or paste it at this prompt instead): "
  read -r TYPED
  if [ -n "$TYPED" ]; then
    API_KEY="$TYPED"
  elif command -v pbpaste > /dev/null; then
    API_KEY="$(pbpaste | tr -d '[:space:]')"
  fi
fi
if [ -z "$API_KEY" ]; then
  echo "No key found (prompt empty and clipboard empty) — aborting. Nothing was changed."
  exit 1
fi

# Show a masked version so you can verify the right thing was captured.
MASKED="${API_KEY:0:10}...${API_KEY: -4} (${#API_KEY} chars)"
case "$API_KEY" in
  sk-ant-*) echo "Captured key: $MASKED" ;;
  *) echo "Warning: captured value doesn't start with sk-ant- : $MASKED" ;;
esac
printf "Use this key? [y/N] "
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted — nothing was changed."
  exit 1
fi

TOKEN="$(openssl rand -hex 24)"

printf "Vault path override (Enter to keep the default VisionAppDev location): "
read -r VAULT_OVERRIDE

# ── 3. Write env files ──────────────────────────────────────────
ENV_CONTENT="ANTHROPIC_API_KEY=$API_KEY
DASHBOARD_TOKEN=$TOKEN"
if [ -n "$VAULT_OVERRIDE" ]; then
  ENV_CONTENT="$ENV_CONTENT
VAULT_PATH=$VAULT_OVERRIDE"
fi

if [ -f "$RUNTIME_DIR/.env.local" ]; then
  cp "$RUNTIME_DIR/.env.local" "$RUNTIME_DIR/.env.local.backup-$(date +%Y%m%d-%H%M%S)"
  echo "Existing .env.local backed up."
fi

umask 077
printf '%s\n' "$ENV_CONTENT" > "$MASTER_ENV"
printf '%s\n' "$ENV_CONTENT" > "$RUNTIME_DIR/.env.local"
echo "Wrote $RUNTIME_DIR/.env.local and master copy $MASTER_ENV (chmod 600)."
echo
echo "If deploy-dashboard.sh wipes the runtime folder on deploy, add this line"
echo "to it right after the copy step so the env survives every deploy:"
echo "    cp \"$MASTER_ENV\" \"\$RUNTIME_DIR/.env.local\""

# ── 4. Restart + verify ─────────────────────────────────────────
if command -v launchctl > /dev/null; then
  echo
  echo "Restarting $SERVICE..."
  launchctl kickstart -k "gui/$(id -u)/$SERVICE" || echo "(kickstart failed — restart the server manually)"
  sleep 3
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/login || echo 000)"
  if [ "$CODE" = "200" ]; then
    echo "Server is up and the login page responds. ✓"
  else
    echo "Login page returned HTTP $CODE — check the server log if this isn't 200 shortly."
  fi
fi

echo
echo "════════════════════════════════════════════════════════"
echo " Your dashboard token (this is your login password):"
echo "   $TOKEN"
echo " Save it in your password manager, then open:"
echo "   http://localhost:3000"
echo "════════════════════════════════════════════════════════"
