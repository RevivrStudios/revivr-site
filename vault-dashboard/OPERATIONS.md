# Revivr Operations Dashboard

## Canonical Instance

The Revivr Operations Dashboard is centralized on MiniTower.

- Official URL: `http://minitower.local:3000`
- Canonical source: `/Volumes/Sureal Drive/Revivr Site /vault-dashboard`
- Service: `com.revivr.vault-dashboard`
- Port: `3000`

Other Macs should use the MiniTower URL as clients. They should not run their own dashboard server unless the user explicitly asks for a temporary test instance.

## Agent Rules

Agents must not edit or serve dashboard copies from:

- `~/.gemini/antigravity/mcp/vault-dashboard`
- `~/.gemini/antigravity-ide/mcp/vault-dashboard`
- `~/.gemini/antigravity-backup/mcp/vault-dashboard`
- Any local Mac Studio or Studio 2 dashboard copy

Those paths may exist for tool/runtime history, but they are not authoritative.

Before changing dashboard behavior, agents must confirm the target path is the canonical MiniTower source path. If the agent is not running on MiniTower, use SSH or stop and ask.

## Deployment

After editing source files on MiniTower:

```zsh
cd "/Volumes/Sureal Drive/Revivr Site /vault-dashboard"
npm run build
launchctl kickstart -k "gui/$(id -u)/com.revivr.vault-dashboard"
```

Verify the served site:

```zsh
curl -s -o /dev/null -w "%{http_code}\n" "http://minitower.local:3000/prompts"
```

## Stale Build Policy

`.next` is generated output. Do not manually sync it across machines.

Old generated folders may be deleted after confirming the canonical service is running from a fresh build:

- `.next.pre-rebuild-*`
- `.next.stuck-*`
- `node_modules.incomplete-*`

Do not delete source folders, `app/`, `data/`, `public/`, or package files as part of stale-build cleanup.
