# Phase 3 Design — Assistant delegates to Quinn's brain

Status: **DESIGN / not implemented.** Plan-only deliverable of the 2026-07-13
capability audit (Assistant verdict: "worth merging"). No code changes yet.

## Goal

Keep the dashboard's chat UI, its **project/problem thread binding**, and its
**three dashboard-only tools** (`get_dashboard_status`, `get_marketing_snapshot`,
`save_report`), but stop running a second, amnesiac brain that re-reads the
vault and forgets everything between threads. Give the assistant Quinn's
**persistent memory** and identity.

## Key constraint discovered

There is **no headless "run a Quinn turn" endpoint.** Quinn's reasoning runs
inside the OpenClaw runtime, reachable only via Telegram / direct chat / cron.
What *is* headless and reusable:

- **Memory scripts** (`OpenClaw_Sandbox/scripts/`): `memory-retrieve "<query>"`
  (reads concept nodes → `MEMORY.md` → daily logs, prints text) and
  `memory-append <TASK|MEETING|DECISION|EMAIL|NOTE> "<content>"` (appends a
  timestamped line to `OpenClaw_Sandbox/memory/daily/YYYY-MM-DD.md`). Pure
  text-in/text-out — trivially callable from Node via `child_process`.
- **Persona markdown** (`Runtime_Persona/`): `Quinn_Identity.md`, `Quinn_Soul.md`,
  `Quinn_User_Context.md`.

The only existing wire between the systems is `quinn-vault` (Quinn → dashboard,
read-only GET). There is no dashboard → Quinn wire today.

## Recommended approach — Option A (in-process): persona + memory tools

Two localized changes; the engine loop, thread store, UI, and existing 8 tools
stay as they are.

1. **`app/lib/assistant/engine.js`** — extend the cached `BASE_SYSTEM` block with
   Quinn's identity/soul/user-context (read from `Runtime_Persona/*`), so the
   assistant reasons *as* Quinn. Keep the per-turn `buildContextBlock` (Project
   Registry + project/problem binding) appended after it, unchanged.
2. **`app/lib/assistant/tools.js`** — add two tools that shell out to the
   deterministic scripts:
   - `quinn_memory_retrieve(query)` → `python3 <QUINN_SCRIPTS_DIR>/memory-retrieve "<query>"`
   - `quinn_memory_append(type, content)` → `python3 <QUINN_SCRIPTS_DIR>/memory-append <TYPE> "<content>"`
   Optionally expose select read-only `quinn-*` wrappers (calendar/mail/reminders)
   later. The 3 dashboard-only tools and 5 vault tools are untouched.
3. **`app/lib/config.js`** — add env-overridable `QUINN_SCRIPTS_DIR` and
   `QUINN_MEMORY_DIR` (never hardcode `/Users/...`, per AGENTS.md).

### What this buys / its honest limit
The assistant gains Quinn's persona and read/write access to the shared memory
store — so "what did I commit to in the last PeriPal meeting" becomes
answerable. **But it is Quinn-*flavored*, not the same running Quinn instance.**
Two brains now write the same memory store; `memory-append` must stay the single
writer to avoid drift.

## Alternatives (rejected for now)

- **Option B — build a Quinn turn-runner** (new headless service that loads full
  persona + memory + Quinn's tool belt, runs a real model turn; dashboard POSTs
  to it). The only way to get the *actual* single Quinn brain, but duplicates the
  engine loop, needs a supervised LaunchAgent, and re-plumbs the 3 dashboard
  tools + binding into it. Highest effort. Revisit only if "Quinn" must mean the
  exact same instance everywhere.
- **Option C — invert via MCP**: expose the 3 dashboard tools to Quinn (extend
  `app/api/mcp/execute` + `status`), make the chat UI a thin Quinn front-end.
  Discards the stateful thread store and self-contained loop; depends on Quinn's
  runtime being reachable from the browser (it isn't today). Biggest surface
  change.

## Guardrails (all options)
- Every shell-out logged via `logAction()` (source `assistant`).
- `memory-append` is the single writer to the memory store.
- Scripts require the OpenClaw memory vault synced on the host (true on the Macs).
- Paths via config, env-overridable — no hardcoded user/drive paths.

## Files to touch (Option A)
`app/lib/assistant/engine.js`, `app/lib/assistant/tools.js`, `app/lib/config.js`.
Read-only dependencies: `Runtime_Persona/Quinn_Identity.md`, `…/Quinn_Soul.md`,
`OpenClaw_Sandbox/scripts/memory-retrieve`, `…/memory-append`.

## Open decisions for Einar
1. **Option A vs B** — Quinn-flavored assistant sharing memory (A, low-risk), or
   invest in one true Quinn brain everywhere (B)?
2. **Write scope** — allow the assistant to `memory-append`, or read-only
   (`memory-retrieve`) at first to watch it before granting writes?
3. **Tool breadth** — memory only, or also expose read-only `quinn-*`
   calendar/mail/reminders wrappers into chat?
