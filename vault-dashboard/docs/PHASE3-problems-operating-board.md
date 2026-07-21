# Phase 3 Design — Problems tickets feed the Operating Board

Status: **DESIGN / not implemented.** Plan-only deliverable of the 2026-07-13
capability audit (Problems verdict: "worth merging"). No code changes yet.

## Goal

Stop Problems tickets being an invisible dashboard-only silo. Surface them where
the team/agents already look — closing the documented **2026-07-08 "open gap"**
in `Revivr_Operating_Board.md` about where blocker tracking should live once
RAD.app is quarantined.

## Why they're a silo today

Tickets live at `<dashboard>/data/problems/PROB-NNN.md` — and `data/` is
**gitignored runtime state inside the dashboard install, not in the vault**. The
framework's blocker surfaces can't see them. Model (`app/lib/problems.js`):

```
id: PROB-NNN (monotonic)   status: open|investigating|blocked|solved|archived
severity: low|medium|high|critical   project: <free text>
created/updated: YYYY-MM-DD   body: markdown (notes appended as "## Note (DATE)")
```
API: `GET` list, `POST` create, `PATCH` update — every mutation already logged
via `logAction()` (a natural sync trigger point). No hard delete (`archived` is
soft-delete).

## Target surface & exact format

Primary target: **`OpenClaw_Sandbox/Company_Handbook/Revivr_Operating_Board.md`**,
which the 2026-07-08 note already declares "the operating surface." Its
`## Blockers` table:

```
| Blocker | Owner | Next Action | Due |
|---|---|---|---|
```

Leave these **human/Quinn-owned** (do not auto-write into the curated sections):
- `Intelligence_Briefs/Vault_State.md` `## 🔴 Open Incidents` — Quinn-authored,
  governed by `Directives/VAULT_INCIDENT_PROTOCOL.md` (vault-health incidents, a
  different class than app/infra tickets).
- `Project_State/CURRENT_STATE.md` `## Known Issues / Blockers` — durable infra
  memory, prose bullets.

## Recommended approach — one-way, marker-delimited, scheduled

**Authoritative:** `data/problems/*.md` (the Problems API) — the only place
tickets are created/updated. The board is a **mirror** of the blocked subset,
never the reverse (its hand-authored rules would fight a two-way sync).

Add a **separate, auto-generated, marker-delimited region** to the board — never
touch the human `## Blockers` table:

```
## Blockers (from dashboard — auto-generated, do not edit)
<!-- BEGIN:dashboard-blockers -->
| Ticket | Blocker | Project | Severity | Status | Next Action | Updated |
|---|---|---|---|---|---|---|
| PROB-004 | … | PeriPal | critical | blocked | … | 2026-07-13 |
<!-- END:dashboard-blockers -->
```

- Sync rewrites **only** the text between the markers (idempotent regenerate),
  including the `PROB-NNN` id so it's a faithful, diffable mirror.
- Subset rule: tickets with `status: blocked` (and optionally `open` +
  `severity: critical`).
- **Write path (Option C mechanics):** a decoupled sync (`app/lib/problemsSync.js`)
  run by a scheduled task, with the Problems API optionally triggering an
  immediate run. Decoupling avoids per-request iCloud-write latency and races
  with a human editing the board in Obsidian.

### Optional secondary mirror
For a ticket whose `project` matches a RAD slug, also push via the framework's
sanctioned per-project channel `rad-command set_blocker <slug> "<title>"`
(`Directives/RAD_COMMAND_PROTOCOL.md`). Note RAD.app retires at Phase 5.

## Safety pattern (reuse existing primitives)
- **`safeReadFile`** (`app/lib/vaultFs.js`) for the read-modify-write — retries
  EAGAIN during iCloud downloads; a raw read would intermittently clobber.
- **Region markers** = idempotent replace (the inverse of `save_report`'s
  never-overwrite collision guard; same discipline, opposite direction).
- **New confinement root:** the board lives in the **OpenClaw_Agent** vault, but
  `resolveVaultPath` confines to **VisionAppDev**. Add an env-overridable
  `AGENT_VAULT_PATH` / `OPERATING_BOARD_FILE` in `config.js` and confine writes
  to it.
- **`logAction()`** every sync write (consequential vault write).

## Files to touch (implementation)
`app/lib/problems.js` (blocked-subset selector), `app/api/problems/route.js`
(optional immediate-sync trigger), new `app/lib/problemsSync.js` (region-replace
+ path confinement), `app/lib/config.js` (`AGENT_VAULT_PATH`,
`OPERATING_BOARD_FILE`), reusing `app/lib/vaultFs.js` + `app/lib/actionlog.js`.
Plus a scheduled task to run the sync.

## Open decisions for Einar
1. **Trigger cadence** — scheduled only, real-time on ticket change, or both
   (recommended: scheduled + optional immediate)?
2. **Subset** — mirror only `status: blocked`, or also `open` + `critical`?
3. **RAD channel** — also push per-project tickets via `set_blocker`, or board
   only (given RAD retires Phase 5)?
4. **CURRENT_STATE.md** — leave fully human-owned (recommended), or also append a
   distinct labeled "dashboard-tracked" block?
