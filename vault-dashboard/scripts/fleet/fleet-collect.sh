#!/bin/bash
# fleet-collect.sh — runs on Mac Studio (the dashboard host). SSHes into each
# remote machine over Tailscale, runs fleet-remote-scan.sh there (piped over
# stdin — nothing is installed on the remotes), and writes their session files
# into the board folder the dashboard reads. Single writer = no sync conflicts.
#
# Pull model: no daemon on the remotes, just SSH access. A LaunchAgent runs this
# every few minutes. Unreachable machines keep their last-known files (which age
# to "idle" on the board via the heartbeat rule).

set -u
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
SCANNER="$SELF_DIR/fleet-remote-scan.sh"
BOARD="${FLEET_SESSIONS_DIR:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Fleet/sessions/active}"
WINDOW_MIN="${WINDOW_MIN:-1440}"
SSH_BIN="${SSH_BIN:-/usr/bin/ssh}"
LOG="${FLEET_COLLECT_LOG:-$HOME/.revivr/fleet/collect.log}"

# remote list — "sshtarget|Display Name". Display names are the friendly labels
# (MacCore's ComputerName is "Mac Studio 2"; we show it as "Mac Core").
REMOTES=(
  "einarjohnson@minitower-1.tail55e65d.ts.net|MiniTower"
  "maccore@mac-studio-2.tail55e65d.ts.net|Mac Core"
)

mkdir -p "$BOARD" "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }
slug() { printf '%s' "$1" | tr '[:upper:] /' '[:lower:]--' | tr -cd 'a-z0-9-'; }

for entry in "${REMOTES[@]}"; do
  target="${entry%%|*}"; name="${entry##*|}"
  out="$("$SSH_BIN" -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
        "$target" "MACHINE='$name' WINDOW_MIN=$WINDOW_MIN bash -s" < "$SCANNER" 2>>"$LOG")"
  rc=$?
  if [ $rc -ne 0 ]; then
    log "SKIP $name ($target): ssh rc=$rc — keeping last-known files"
    continue
  fi

  # Split ###SESSION### blocks into files; track which files we wrote.
  written=""
  cur=""; buf=""
  while IFS= read -r line; do
    if [ "${line#\#\#\#SESSION\#\#\# }" != "$line" ]; then
      [ -n "$cur" ] && printf '%s' "$buf" > "$BOARD/$cur"
      cur="${line#\#\#\#SESSION\#\#\# }"; buf=""
      written="$written $cur"
    else
      buf="$buf$line"$'\n'
    fi
  done <<< "$out"
  [ -n "$cur" ] && printf '%s' "$buf" > "$BOARD/$cur"

  # Prune this machine's now-inactive files (its slug prefix, not written now).
  pfx="$(slug "$name")-"
  for f in "$BOARD/$pfx"*.md; do
    [ -e "$f" ] || continue
    b="$(basename "$f")"
    case " $written " in *" $b "*) : ;; *) rm -f "$f" ;; esac
  done

  n="$(printf '%s' "$written" | wc -w | tr -d ' ')"
  log "OK   $name: $n session(s)"
done
