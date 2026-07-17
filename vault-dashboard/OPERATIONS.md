# Revivr Operations Dashboard

## Source of truth

The canonical **source** of the dashboard is the iCloud-synced folder inside
the Obsidian vault — visible and editable from every Mac (Mac Studio,
MiniTower, MacCore):

```
~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard/
```

That is the one place code is changed. Editing it does nothing by itself —
to go live, run `./deploy-dashboard.sh` from that folder. The deploy script
only runs on **Mac Studio** (it refuses elsewhere); it copies the source to
the real runtime, rebuilds, and restarts the server.

- Serve host: **Mac Studio**, port `3000` (plus Tailscale Serve for remote HTTPS)
- Service label: `com.revivr.vault-dashboard`

**This git repo** (`RevivrStudios/revivr-site`, `vault-dashboard/`) is the
development mirror: agent-driven work (Claude Code sessions, PRs) happens
here, then lands in the canonical folder via
`scripts/apply-to-canonical.sh` (backs up canonical first, never touches
`deploy-dashboard.sh`, `.env*`, or runtime `data/` state). After hand-editing
the canonical folder directly, sync those edits back into git so the mirror
stays current.

> History note: earlier canonical locations (MiniTower's
> `/Volumes/Sureal Drive/Revivr Site /vault-dashboard`, then a Mac Studio
> folder) are superseded. The MiniTower copy is under a 30-day deletion
> hold — see the decommission checklist below.

## Configuration

All machine-specific paths and secrets live in `.env.local` on the serve host
(never committed). Copy `.env.example` and fill in:

- `ANTHROPIC_API_KEY` — required for the resident Assistant and awareness briefings
- `DASHBOARD_TOKEN` — required before exposing the dashboard beyond localhost
- `VAULT_PATH` etc. — only if the host's layout differs from the defaults

### Where the *runtime* `.env.local` actually lives

The `.env.example` / canonical-folder `.env.local` above is the **source**.
The **running** server reads a *different* copy — the one
`deploy-dashboard.sh` writes into the runtime directory it deploys to. On
Mac Studio today that is:

```
~/Library/Application Support/Revivr/VaultDashboard/.env.local
```

Don't treat that path as gospel across machines — it's simply "wherever the
running process's working directory is." If you ever need to find the live
`DASHBOARD_TOKEN` (e.g. to sign in a new device by hand), recover it from the
running process rather than guessing the path:

```zsh
launchctl list | grep -i revivr        # find the PID for com.revivr.vault-dashboard
lsof -p <PID> | grep cwd               # that line's path is the runtime directory
grep DASHBOARD_TOKEN "<that dir>/.env.local"
```

> Prefer the QR-code device pairing flow (Settings → Devices, see below)
> over copy-pasting this token by hand — it never exposes the raw token.

### Remote access — always use the Tailscale Serve hostname

Remote HTTPS is via Tailscale Serve. The canonical address is the Serve
**hostname**, which the serve host prints:

```zsh
tailscale serve status                 # run on the serve host (Mac Studio)
```

Always reach the dashboard at that hostname (e.g.
`https://mac-studio.<tailnet>.ts.net/`) — **never** the raw Tailscale IP
(`100.x.y.z`). The login cookie (`revivr_dash_token`) is host-only, so a
cookie set on the hostname is not sent to the IP and vice-versa. Mixing the
two silently forces a re-login and looks exactly like a broken login when it
isn't. Bookmark / home-screen the hostname on each device.

## Deployment

1. Land changes in the canonical folder — either edit it directly, or apply
   a git branch from a checkout:

   ```zsh
   cd /path/to/revivr-site/vault-dashboard
   git pull
   ./scripts/apply-to-canonical.sh
   ```

2. Deploy from the canonical folder (**Mac Studio only**):

   ```zsh
   cd "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard"
   ./deploy-dashboard.sh
   ```

3. Verify the served site, not just local files:

   ```zsh
   curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/login"
   ```

## Scheduled jobs

- `scripts/awareness-refresh.sh` — fetch feeds + distill the daily briefing.
  Schedule daily via launchd (instructions inside the script). Requires the
  dashboard to be running; pass `DASHBOARD_TOKEN` if auth is enabled.
- Agent heartbeats: each agent/launch script POSTs to `/api/agents/heartbeat`
  so the roster shows real presence.

## MiniTower decommission checklist

Do NOT delete the MiniTower folder until all of these are true:

1. Mac Studio serves the dashboard on :3000 (curl check above passes).
2. Any MiniTower-only source edits newer than the git history have been
   diffed and committed to this repo.
3. The MiniTower LaunchAgent `com.revivr.vault-dashboard` is unloaded
   (`launchctl bootout "gui/$(id -u)/com.revivr.vault-dashboard"`).
4. The 30-day hold has elapsed.

## Stale build policy

`.next` is generated output — never sync it between machines; rebuild on the
serve host. Old `.next.pre-rebuild-*` / `.next.stuck-*` /
`node_modules.incomplete-*` folders may be deleted after confirming the
service runs from a fresh build. Never delete `app/`, `data/`, `public/`,
`scripts/`, or package files as cleanup.
