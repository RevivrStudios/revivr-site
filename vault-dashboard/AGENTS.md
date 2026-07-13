<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. (Notably: `middleware.js` is now `proxy.js`.)
<!-- END:nextjs-agent-rules -->

# Revivr Operations Dashboard — agent rules

## Source of truth

The canonical source is the iCloud-synced Obsidian folder:

```
~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard/
```

That is the ONLY place dashboard code is changed on the Macs. Editing it does
nothing by itself — deployment is `./deploy-dashboard.sh` from that folder,
which runs on **Mac Studio only** (it refuses on MiniTower) and copies the
source to the runtime, rebuilds, and restarts the server.

This git repo (`RevivrStudios/revivr-site`, `vault-dashboard/`) is the
development mirror where agent-driven work happens. Apply a checkout to the
canonical folder with `scripts/apply-to-canonical.sh` (it backs up canonical
first and never touches `deploy-dashboard.sh`, `.env*`, or runtime `data/`).
If you hand-edit the canonical folder, sync the edits back into git.

Do not treat any other folder copy — `~/.gemini/antigravity*/mcp/vault-dashboard`,
the held MiniTower copy, or the Mac Studio runtime the deploy script writes
to — as a source. Never edit the runtime directly; changes there are
overwritten on the next deploy.

## Deploy flow

```zsh
# from a git checkout, on any Mac with the vault synced:
./scripts/apply-to-canonical.sh

# then, on Mac Studio only:
cd "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard"
./deploy-dashboard.sh
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/login"
```

## Code conventions

- All machine-specific paths come from `app/lib/config.js` (env-overridable).
  Never hardcode `/Users/<name>/...` or drive paths in routes or components.
- Consequential actions (shell executes, assistant turns, exports, feed
  refreshes) must be recorded via `logAction()` (`app/lib/actionlog.js`).
- Vault writes from the assistant are collision-guarded and path-confined —
  keep it that way when adding tools (`app/lib/assistant/tools.js`).
- `data/` subfolders for runtime state (threads, problems, awareness, status,
  logs) are gitignored; `data/experiments/` is tracked source.

## Never do

- Serve a second instance on another machine without being asked.
- Commit `.env.local`, API keys, or `data/` runtime state.
- Copy `.next` build output between machines.
