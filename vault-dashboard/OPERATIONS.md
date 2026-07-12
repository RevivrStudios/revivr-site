# Revivr Operations Dashboard

## Source of truth

The canonical **source** of the dashboard is this git repository
(`RevivrStudios/revivr-site`, directory `vault-dashboard/`). Every change is
made here (or synced here) and deployed to the serve host. Folder copies on
individual Macs are deployments, not sources.

- Deploy/serve host: **Mac Studio**
- Official URL: `http://<mac-studio-hostname>.local:3000` (plus Tailscale Serve for remote HTTPS)
- Service label: `com.revivr.vault-dashboard`
- Port: `3000`

> History note: until mid-2026 the canonical instance was MiniTower
> (`/Volumes/Sureal Drive/Revivr Site /vault-dashboard`). That copy is under a
> 30-day deletion hold. See "MiniTower decommission checklist" below before
> deleting it.

## Configuration

All machine-specific paths and secrets live in `.env.local` on the serve host
(never committed). Copy `.env.example` and fill in:

- `ANTHROPIC_API_KEY` — required for the resident Assistant and awareness briefings
- `DASHBOARD_TOKEN` — required before exposing the dashboard beyond localhost
- `VAULT_PATH` etc. — only if the host's layout differs from the defaults

## Deployment (on Mac Studio)

```zsh
cd /path/to/revivr-site/vault-dashboard
git pull
npm install
npm run build
launchctl kickstart -k "gui/$(id -u)/com.revivr.vault-dashboard"
```

Verify the served site, not just local files:

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
