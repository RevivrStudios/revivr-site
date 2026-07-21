# Option E — turn-runner staged design

Status: **DESIGN / not built.** Supersedes the three abstract options in
`PHASE3-assistant-quinn.md` now that we know how Quinn actually runs
(`E-quinn-runtime-today.md`). No code yet.

## The reframing

The old Option B ("build a Quinn turn-runner") assumed we'd have to build a
reasoning service. We don't — **the turn-runner already exists** as
`openclaw agent --agent quinn --message … --session-id … --json`. So E is no
longer "build a brain"; it's "**point the dashboard at the brain that's already
there, then converge the surfaces.**" That makes it a low-risk, incremental
staircase.

**The one thing to accept going in:** delegating means the dashboard chat is
answered by **gpt-5.5 (Codex/ChatGPT backend)** — the same brain as Telegram —
not the dashboard's current Claude loop. That's the *point* of "one true Quinn,"
but it's a real change in who answers, so it's a Stage-0 decision, not a detail.

---

## Stage 1 — Turn-runner adapter (dashboard can invoke a real Quinn turn)

**Goal:** a dashboard-side function that runs one real Quinn turn and returns the text.

- New `app/lib/assistant/quinnRunner.js`: `runQuinnTurn({ message, sessionId, thinking, timeoutMs })` → shells out (via `execFile`, absolute `OPENCLAW_BIN`) to
  `openclaw agent --agent quinn --message <message> --session-id <sessionId> --thinking <level> --json`, parses `result.payloads[0].text`. (Same headless call the cron scripts use; shell-outs from next-server are already proven with `asc`/`memory-retrieve`.)
- **Session mapping:** dashboard thread `T` → `--session-id dash-<T>`, so each thread is a resumable Quinn session (conversation state then lives in openclaw's session store, not the dashboard thread JSON).
- **Context:** prepend the thread's project/problem binding block (the existing `buildContextBlock`) into `message`, since a delegated turn runs in openclaw's own tool sandbox and won't see the dashboard's tools yet.
- **Config:** `OPENCLAW_BIN` (default `/opt/homebrew/bin/openclaw`), `QUINN_AGENT_ID` (default `quinn`), env-overridable. Gateway must be up (it's a `KeepAlive` daemon); adapter surfaces a clear error if not.
- **Not wired into the UI yet** — Stage 1 is the adapter + a dev-only route to exercise it.

**Verification:** call the adapter with a test message + throwaway session-id; confirm a real gpt-5.5 reply comes back; confirm session resume works with a second turn on the same id.

**Risks:** gateway dependency; gpt-5.5 latency (turns are slower than the Claude loop — default `--timeout` 600s vs dashboard `maxDuration` 300); openclaw session store grows per dashboard thread.

---

## Stage 2 — Make Quinn the dashboard chat backend (behind a flag)

**Goal:** the assistant UI, optionally, is a window into Quinn.

- `engine.js` gains a delegation mode: when `ASSISTANT_BACKEND=quinn`, `runAssistantTurn` calls `runQuinnTurn` instead of the Anthropic loop; otherwise it keeps the Phase-3A Quinn-flavored Claude loop.
- **Keep the Claude loop as the automatic fallback** when the gateway is unreachable — the dashboard chat must never hard-depend on the daemon.
- UI: handle longer turns (async/pending state already exists), and surface tool activity from the turn's trajectory if useful.
- Thread lifecycle ↔ openclaw session lifecycle: creating/deleting a dashboard thread maps to a `dash-<T>` session; document that the transcript of record for delegated threads is openclaw's.

**Verification:** flip the flag; hold a multi-turn conversation in the dashboard that demonstrably shares memory with Telegram Quinn (ask it something only memory knows, added via Telegram); flip back and confirm fallback still works.

**Decision:** default backend stays Claude-loop until you're satisfied; `quinn` is opt-in per environment.

---

## Stage 3 — Unify tools & binding (the dashboard's unique value flows *into* Quinn)

**Goal:** Quinn — from *any* surface — can use the 3 dashboard-only tools and understand thread binding, instead of the dashboard keeping a second toolset.

- Build a small **MCP server exposing the dashboard's tools** (`get_dashboard_status`, `get_marketing_snapshot`, the action log; optionally the vault-report writer) and register it in `openclaw.json` `mcp.servers` — exactly how `google-drive`/`drivectl --mcp` is already wired. Now Telegram-Quinn, cron-Quinn, and dashboard-Quinn all share one tool surface.
- **Thread binding** becomes session metadata / a context preamble the adapter passes, rather than dashboard-side tool plumbing.
- Net effect: the dashboard stops being a parallel agent and becomes a **tool/data provider to the one Quinn**.

**Verification:** from Telegram, ask Quinn "what's the dashboard status?" and have it answer via the new MCP tool.

**Risks:** MCP tools need the same guarantees the in-dashboard tools have (path confinement, collision guard, `logAction`); the MCP server is a new long-running surface to supervise.

---

## Stage 4 — Converge & retire the parallel brain

**Goal:** one Quinn everywhere; delete the duplication.

- Make `ASSISTANT_BACKEND=quinn` the default; **retire the dashboard's separate Anthropic assistant loop** (keep only a thin "gateway down" degraded notice, not a full second brain).
- Retire the Phase-3A in-dashboard memory tools (`quinn_memory_retrieve/append`) — redundant once the real Quinn (which already does scripted memory) answers.
- The dashboard's assistant role narrows to: **UI + MCP tool/data provider + operational surfaces** (Problems, Awareness, marketing glass, renewals) that Quinn consumes.
- Fold in the two hygiene fixes from the current-state doc (hard-coded Telegram token in `quinn-morning-briefing`/`kaizen-review`; heartbeat 10m-vs-2h discrepancy) as part of the cleanup pass.

**Verification:** dashboard chat, Telegram, cron, and email all demonstrably hit one runtime with shared memory/session semantics and one identity; no second reasoning loop remains.

---

## Why this ordering
Each stage is independently shippable and reversible, and value lands early:
Stage 1 proves the call; Stage 2 gives a real shared-memory chat behind a flag
with a safe fallback; Stage 3 is where the dashboard's unique tools stop being a
silo; Stage 4 only removes the parallel loop once 1–3 have earned it. Nothing
here requires building a reasoning engine — the risky part the old Option B
implied simply doesn't exist anymore.

## 2026-07-14 update — latency diagnosis changes Stage 2 (see E-latency-diagnosis.md)

Living with Stage 2 surfaced a real problem the original design didn't
anticipate: a slow delegated turn trips the 280s cap and **silently falls back
to Claude with no signal** — a *trust* failure, not just latency. Tracing the
slow turn showed the model was fast (2–4s, zero tools); the cost was a **218s
dispatch wait** on the single-concurrency lane (evidence points to
scheduler-alignment, not turn-contention — needs a repro to confirm).

**New required sub-stage — Stage 2.5 (async + backend transparency):** make the
chat submit+poll instead of blocking the HTTP request, show an honest "queued
behind Quinn's other work" state, and **always label which brain answered**
(Quinn vs Claude-fallback). This is the one fix that touches neither Quinn's
concurrency nor its memory model. `maxConcurrent` is deferred pending a
contention-vs-dispatch repro (memory-append is atomic-append-safe, so the store
itself is not the blocker).

## Open decisions for Einar
1. **Green-light the model shift?** Dashboard chat answered by gpt-5.5/Codex-Quinn, not Claude. (Stage 0 gate.)
2. **Gateway vs `--local`** for the adapter — dispatch to the running daemon (simpler, shared state) vs embedded per call (no daemon dep, needs provider auth in the server env). Recommend gateway.
3. **Session model** — one openclaw session per dashboard thread (`dash-<T>`), accepting that openclaw becomes the transcript of record for delegated threads. OK?
4. **How far to go** — stop at Stage 2 (shared-memory chat, both brains coexist) or push through Stage 4 (single brain, parallel loop retired)?
