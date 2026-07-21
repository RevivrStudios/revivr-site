<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. (Notably: `middleware.js` is now `proxy.js`.)
<!-- END:nextjs-agent-rules -->

# ⚠️ SUPERSEDED — this folder is NOT the canonical dashboard source (2026-07-13)

This `vault-dashboard/` folder was a development mirror for a one-off feature
build. Do not develop here, and do not sync it anywhere.

The real dashboard source is `Infrastructure/VaultDashboard/` inside the
**OpenClaw_Agent repo** (remote: `Quinn.git`), which lives on the Macs at:

```
~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/OpenClaw_Agent/Infrastructure/VaultDashboard/
```

That folder has its own `AGENTS.md`/`CLAUDE.md`, its own git history (command
deck, Marketing vault glass, RAD integration), and deploys via its
`./deploy-dashboard.sh` (Mac Studio only). (An earlier revision of this notice
pointed at a `canonical-live-state` snapshot branch, but that branch was never
pushed and no longer exists — Quinn.git `main` is the only live-state record.)

## Why this warning exists

On 2026-07-13, `scripts/apply-to-canonical.sh` was run from this folder and
**overwrote newer canonical work** (the command-deck home, Sidebar links to
RAD/Marketing/Decisions/Ship Review) because this folder was based on a stale
snapshot. The damage was recovered from the script's automatic backup plus
git history, but do not repeat it: the script now refuses to run without
`FORCE_APPLY=1`, and it should effectively never be run again.

If you are an agent asked to change the dashboard: work in the OpenClaw_Agent
repo's checkout on the Macs, on a branch, committing as you go — never leave
work only in an uncommitted working tree.

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
