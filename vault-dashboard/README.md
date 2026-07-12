# Revivr Operations Dashboard (v3)

The command center for Revivr Studios: app-development context, resident AI,
awareness briefings, and operational state — in one place.

## What's inside

| Area | What it does |
|---|---|
| **Assistant** (`/assistant`) | Resident Claude-powered operations AI with persistent threads. Auto-loads project context (registry, state file, latest handoff, known failure modes) so nothing has to be re-explained. Tools: project context, vault read/search, failure-mode lookup, live status, collision-guarded report saving. |
| **Problems** (`/problems`) | Problem tickets — capture symptoms/context once, track status, and open an assistant thread pre-loaded with the ticket. |
| **Awareness** (`/awareness`) | RSS/Atom ingestion across AI, healthcare, robotics, and Apple developer news; Claude-distilled daily briefings, archived into the vault. Schedule `scripts/awareness-refresh.sh`. |
| **Quinn** (`/quinn`) | Live agent heartbeats (`POST /api/agents/heartbeat`) and the append-only action audit log. |
| **Quell** (`/quell`) | App portfolio, App Store review monitoring (public per-app feeds, no ASC credentials), and the campaign/launch pipeline. |
| **Resources** (`/resources`) | Machines, drives, certificates, subscriptions, licenses, domains — with a 45-day expiry radar. |
| **Vault** (`/vault`) | Knowledge-graph health, analytics, drift alerts, MCP engine status, action center. |
| **Incubator** (`/incubator`) | Experiment registry with edit and export-to-RAD. |
| **Prompts** (`/prompts`) | Copy-paste prompt library for external agent sessions. |
| **Auth** | Set `DASHBOARD_TOKEN` to gate every page and API (cookie via `/login`, or `Authorization: Bearer`). Mandatory before remote exposure. |

## Quick start

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY, DASHBOARD_TOKEN, paths
npm run dev                  # or: npm run build && npm start
```

Configuration is centralized in `app/lib/config.js`; everything is
env-overridable, nothing is machine-hardcoded.

## Source of truth & deployment

Git is canonical; Mac Studio serves. See `OPERATIONS.md` for deployment,
scheduled jobs, and the MiniTower decommission checklist. Agent rules live in
`AGENTS.md`.
