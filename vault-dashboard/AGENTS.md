<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. (Notably: `middleware.js` is now `proxy.js`.)
<!-- END:nextjs-agent-rules -->

# Revivr Operations Dashboard — agent rules

## Source of truth

The canonical source is **this git repository** (`RevivrStudios/revivr-site`,
`vault-dashboard/`). Make changes on a branch here; the serve host
(**Mac Studio**) pulls and rebuilds. Do not treat any loose folder copy —
`~/.gemini/antigravity*/mcp/vault-dashboard`, the held MiniTower copy, or any
other Mac's checkout — as authoritative, and do not serve from them.

Before editing, confirm you are inside a git checkout of this repo
(`git remote -v` shows RevivrStudios/revivr-site). If you find yourself in a
non-git folder copy, stop and ask.

## Deploy after merging (on Mac Studio)

```zsh
git pull && npm install && npm run build
launchctl kickstart -k "gui/$(id -u)/com.revivr.vault-dashboard"
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
