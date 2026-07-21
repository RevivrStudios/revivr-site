# Option E — the latency finding (and why it's really a trust finding)

Status: **DIAGNOSIS.** Read-only trace of the slow Stage-2 turn (2026-07-14).
Overturns an assumption the original E design didn't anticipate. No changes made
in producing this.

## The headline is not latency — it's a silent brain-swap

When a delegated Quinn turn runs long, the adapter's 280s runner cap trips and
`runAssistantTurn` **falls back to the Claude loop** — with no signal to the
user. Someone thinks they're talking to Quinn, waits minutes, and gets a
Claude-written answer labeled as if it were Quinn's. That directly undermines the
"one true Quinn" premise, so fixing this is **non-optional**, not a nice-to-have.
The fix must include making *who answered* visible.

## What the slow turn actually was (traced, not guessed)

From the session trajectory `~/.openclaw/agents/quinn/sessions/dash-28c21852-….trajectory.jsonl`:

| | Turn 1 | Turn 2 ("slow") |
|---|---|---|
| Model run time (prompt→completed) | **2.3s** | **3.9s** |
| Tools invoked | **0** | **0** |
| Output tokens | 18 | 16 |
| timedOut / aborted | false / false | false / false |

The model was fast both times. But turn 2 **fired right after turn 1 and did not
start executing for 218s** (18:18:55 → 18:22:33 UTC), then ran in 3.9s. My
client curl timed out at 200s *inside that wait*.

### Ruled out (each checked, not assumed)
- **Thinking level:** adapter passes `--thinking low`, which already matches
  Quinn's `thinkingDefault: low`; model ran in 2–4s regardless. Irrelevant.
- **Gateway vs `--local`:** gateway dispatch, warm (73ms). No cold-start.
- **Tool loop:** zero tools invoked; `web_fetch` was only *offered*, not called.

### What ate the 218s — evidence points to dispatch, not contention
- `agents.defaults.maxConcurrent: 1` (Quinn inherits) — one turn at a time, one
  lane shared by Telegram, the 10-min heartbeat, `quinn-email-inbox` (5-min),
  `team-checkin` (2h), and dashboard turns.
- **But the lane was idle during the wait:** the gateway log shows *no* turn-start
  (tool-policy) events between 11:18:56 and 11:22:33, and only **1 log line total**
  in that 218s — no backend/auth/retry/backoff/error events.
- Turn 2 dispatched **exactly at the 11:22:33 heartbeat tick** (a heartbeat turn
  started at the same instant).
- **Reading:** this looks like a *dispatch/scheduler-alignment* delay (the queued
  turn wasn't picked up until the next heartbeat/scheduler cycle), **not** another
  turn's model loop hogging the lane. ⚠️ Single sample — needs a controlled repro
  to confirm contention-vs-dispatch. The async work below makes that easy to
  observe.
- **Implication:** raising `maxConcurrent` may not even fix *this* symptom if the
  delay is dispatch alignment rather than turn contention.

## Memory-safety of raising `maxConcurrent` (asked for regardless)

The fear was concurrent turns corrupting the shared memory store. Traced the scripts:
- **`memory-append`** = `open(daily_file, 'a')` + a single `f.write(line)` — an
  **atomic O_APPEND**. Concurrent appends each land intact; no read-modify-write,
  no lost writes. (Only micro-race: the first-append-of-day header `open('w')`
  check-then-write — tiny, low-consequence.)
- **`memory-retrieve`** = read-only, no locks. An in-progress append is atomic, so
  a reader never sees a half-line.
- **`memory-synthesize`** (weekly) does read daily notes and rewrite `MEMORY.md`
  — the one place a concurrent append could be *missed by that pass* (still
  retained in the daily file), not corrupted.
- Sessions are per-`session-id` (dash-`<thread>` vs telegram-peer vs heartbeat),
  and runtime state is SQLite (WAL-locked).

**Verdict:** the memory-corruption hazard is much smaller than feared — appends
are atomic and sessions are isolated. Still, don't raise the number yet (per the
call), because (a) this symptom may be dispatch-not-contention and (b) a lock
around weekly `memory-synthesize` would be the belt-and-suspenders if we do.

## Repro results (2026-07-14) — contention confirmed, plus autonomous-lane pressure

Ran a controlled repro (`openclaw agent` turns, trivial message, `--thinking off`):
- **Test B — 3 concurrent turns serialized:** finished at +30s / +83s / +111s
  (≈3× a single turn). So `maxConcurrent: 1` **is** contention-bound — concurrent
  turns queue; raising it would let them run in parallel.
- **Test A — 4 sequential "idle" turns took 20–98s each** despite the model being
  2–4s. Over that ~3.5-min window the 10-min heartbeat and 5-min email poll almost
  certainly fired and occupied the single lane, so even "idle" dashboard turns keep
  landing behind Quinn's **autonomous** traffic. The earlier 218s is this same
  effect at the tail.

**Conclusion:** the fix is two independent levers — (1) **raise `maxConcurrent`**
(2–3) so dashboard turns run alongside heartbeat/email/cron instead of queuing
(memory is atomic-append-safe; caveat: concurrent turns hit the one ChatGPT/Codex
OAuth account — watch for rate limits), and (2) **ease autonomous cadence** (the
10-min heartbeat is 12× the pressure the prompt implied). Both are Quinn-runtime
behavior changes → left to Einar with one-line reversible commands.

**Applied this session (safe, no behavior change):** the heartbeat *prompt* now
truthfully says "every 10 minutes" (matches the stable `every: 10m` config) via
`openclaw config set` — cadence unchanged; applies on next gateway restart.

## Decisions (this session)
- **Async submit+poll — DO, regardless.** Doesn't touch Quinn's concurrency or
  memory model, so it carries none of the risk pattern; and it fixes the worst
  part — the UI can honestly show "queued behind Quinn's other work," and **label
  which brain answered** (Quinn vs Claude-fallback), killing the silent swap.
- **`maxConcurrent` — investigate, don't bump.** Memory is mostly safe (above),
  but confirm contention-vs-dispatch with a repro first; it may not be the lever.
- **Heartbeat / email cadence — hold.** Chosen for reasons unrelated to the
  dashboard; don't trade Quinn's autonomy for dashboard speed blindly.
- **Dedicated dashboard lane — ruled out.** Fragments the one-brain premise.
