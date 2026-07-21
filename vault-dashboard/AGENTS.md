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

## Marketing is a vault glass — do NOT rebuild it

The real marketing system is the **`Obsidian/Revivr Marketing/`** vault
(approvals, app profiles, social queue, publish log, voice/golden set). This
dashboard is **glass over it, not a store**: `app/api/marketing/_shared.js`
reads/writes that vault live, and the UI lives at `app/marketing/{approvals,
apps,apps/[slug],social,report}`. The App Store review fetch salvaged for the
apps page lives in `app/lib/appStoreReviews.js`. `/quell` is only an 8-line
redirect to `/marketing/approvals`. Never reintroduce a local-JSON portfolio /
campaign store (`app/lib/marketing.js`) — that duplicates vault truth and
violates the "Glass, Not Storage" prime directive.

## 2026-07-13 incident & capability audit

- An `apply-to-canonical.sh` sync overwrote canonical with a session's worth
  of features (Assistant, Awareness, Problems, Resources, a Quell rebuild)
  built without knowing this framework already existed. It also regressed the
  command-deck home + sidebar. A capability audit against `OpenClaw_Agent`
  produced these verdicts:
  - **Awareness** — keep (only external-news briefing system; `Intelligence_Briefs/` is static internal-ops docs).
  - **Assistant / Problems** — keep, but merge into the framework (Quinn's memory/tools; `Revivr_Operating_Board.md` blocker surface) — Phase 3, not done yet.
  - **Resources** — removed. Machines/drives/certs are owned by `Infrastructure/STUDIO_NETWORK_REGISTRY.md` + `studio-health/`.
  - **Quell/Marketing** — removed the rebuild; restored the vault glass (see above).
- Also fixed 2026-07-13: `deploy-dashboard.sh` rsync `--delete` was wiping the
  runtime `.env.local`; now excluded + restored from `~/.revivr-dashboard.env`.

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
