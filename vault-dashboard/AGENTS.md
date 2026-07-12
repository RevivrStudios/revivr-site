<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Revivr Operations Dashboard Authority

This dashboard has one canonical running instance:

- Canonical host: `MiniTower`
- Official URL: `http://minitower.local:3000`
- Canonical source path on MiniTower: `/Volumes/Sureal Drive/Revivr Site /vault-dashboard`
- LaunchAgent label: `com.revivr.vault-dashboard`

Do not run a second dashboard server on another machine unless the user explicitly asks for a temporary test server. Do not treat any copy under `~/.gemini/antigravity*/mcp/vault-dashboard` as the source of truth.

Before editing, confirm you are working against the canonical source path above. If you are on another Mac, either SSH to MiniTower or explicitly state that the edit is being made to a non-canonical copy and ask before proceeding.

After source changes on MiniTower, rebuild and restart the canonical service:

```zsh
cd "/Volumes/Sureal Drive/Revivr Site /vault-dashboard"
npm run build
launchctl kickstart -k "gui/$(id -u)/com.revivr.vault-dashboard"
```

Verify the deployed site, not just local files:

```zsh
curl -s -o /dev/null -w "%{http_code}\n" "http://minitower.local:3000/prompts"
```

Generated build folders such as `.next`, `.next.pre-rebuild-*`, and `.next.stuck-*` are not canonical source. Do not copy them between machines.
