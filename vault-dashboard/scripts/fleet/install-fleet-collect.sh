#!/bin/bash
# install-fleet-collect.sh — installs the fleet collector as a LaunchAgent on
# Mac Studio (the dashboard host). Copies the scanner + collector to a stable
# local path (~/.revivr/fleet, off iCloud so launchd never hits an evicted
# file) and loads a LaunchAgent that runs every 180s.
#
#   ./install-fleet-collect.sh            # install + load
#   ./install-fleet-collect.sh uninstall  # unload + remove
set -euo pipefail

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.revivr/fleet"
LABEL="com.revivr.fleet-collect"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ "${1:-}" = "uninstall" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Uninstalled $LABEL (scripts left in $DEST)."
  exit 0
fi

# Only Mac Studio (the dashboard host) should run the collector.
HOST="$(scutil --get LocalHostName 2>/dev/null || hostname)"
case "$HOST" in
  *MacRevivr-Studio*) : ;;
  *) echo "Refusing to install on '$HOST' — the fleet collector runs on Mac Studio (the dashboard host) only."; exit 1 ;;
esac

mkdir -p "$DEST"
cp "$SELF_DIR/fleet-remote-scan.sh" "$SELF_DIR/fleet-collect.sh" "$DEST/"
chmod +x "$DEST/fleet-remote-scan.sh" "$DEST/fleet-collect.sh"

mkdir -p "$HOME/Library/LaunchAgents"
sed "s|__HOME__|$HOME|g" "$SELF_DIR/$LABEL.plist" > "$PLIST"

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "Installed $LABEL — collecting every 180s into the fleet board."
echo "Scripts: $DEST   Log: $DEST/collect.log"
