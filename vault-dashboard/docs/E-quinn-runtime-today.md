# How Quinn reasons today — end to end

Status: **RESEARCH / current-state reference.** Read-only investigation of the
OpenClaw runtime (2026-07-14), feeding the turn-runner design (`E-turn-runner-staged-design.md`).
No secrets are recorded here; auth values were inspected and redacted.

## TL;DR

All of Quinn's reasoning runs inside **one persistent runtime** — the
`ai.openclaw.gateway` daemon holding agent `quinn` (model **`openai/gpt-5.5`**
via the ChatGPT backend + **Codex** agent runtime, OAuth-authed). A single turn
is a first-class headless command:

```
openclaw agent --agent quinn --message "<prompt>" --session-id <id> --thinking <off|low|…> --json
→ {"status":"ok","result":{"payloads":[{"text":"<Quinn's reply>"}]}}
```

Shell scripts never call an LLM directly — they shell out to `openclaw`.

## The three (and only three) turn triggers

1. **Inbound Telegram.** The gateway long-polls `getUpdates`; the single
   `bindings` route `{channel: telegram → agent quinn}` sends every Telegram
   message to Quinn. Group `-5197459156` (the Einar/Quinn/Quell team group) has
   `requireMention: true`; DMs fire unconditionally. Sessions are
   `per-channel-peer` (each peer/DM is its own resumable session).
2. **Runtime heartbeat.** `agents.list[quinn].heartbeat`: `every 10m`,
   active 07:00–20:00 America/Vancouver, to Einar's DM — a "stay silent unless
   urgent" prompt (vault health < 70%, iCloud offload, deadline < 24h, gateway
   errors). *Discrepancy to note: the prompt text says "every 2 hours" but the
   config `every` is `10m`.*
3. **Explicit `openclaw agent` CLI calls.** Only **two** cron scripts actually
   run a Quinn LLM turn:
   - `quinn-quell-team-checkin` (every 2h) → `openclaw agent --agent quinn --session-id quinn-quell-team-checkin --message "$PROMPT" --timeout 180 --json`, parses `result.payloads[0].text`, posts to Telegram if not `NO_TEAM_UPDATE`.
   - `quinn-email-inbox` (every 5m) → `subprocess openclaw agent --agent quinn --message <email-as-task> --session-id email-<ts> --thinking off --json`, replies over SMTP.

**Everything else labeled "Quinn" is mechanical Python** — `quinn-morning-briefing`,
`kaizen-review`, `memory-synthesize`, `quinn-snapshot`, `quinn-mac-watch` etc.
gather data and POST straight to the Telegram bot API (or just write files).
No LLM turn. (`quinn-team-telegram` / `quinn-cron-monitor` only `openclaw message send` — delivery, not reasoning.)

## The model loop

- Quinn's model: **`openai/gpt-5.5`** — but the `openai` provider is the
  **ChatGPT backend** (`baseUrl https://chatgpt.com/backend-api`,
  `api openai-chatgpt-responses`, `agentRuntime codex`), authed by **OAuth
  profile `openai-codex:default`** (no API key). Verified: `winnerProvider=openai-codex`.
- **No configured fallback list** (`fallbacks: none`). Resilience is at the
  auth-profile level (usage stats / profile order). Alternates defined but not
  default: Ollama (`minimax-m2.7`, `gemma4:31b`, `ministral-3:8b`), and per-agent
  `anthropic-vertex` (Claude Opus/Sonnet 4.6) + `x-ai` (Grok) — reachable via `--model`.
- **Tool loop:** `tools.profile "coding"`, allow-list
  `[read, edit, write, exec, process, browser, web_fetch]`, exec gated by
  `~/.openclaw/exec-approvals.json`. MCP folds in via `mcp.servers` (currently
  `google-drive` → `drivectl --mcp`). `memory-core` is a runtime plugin, but the
  vault workflow uses scripted memory (below), not it.
- **Execution paths:** default dispatches the turn to the running Gateway
  (`ws://127.0.0.1:18789`, loopback, token auth, `KeepAlive` daemon). `--local`
  runs the loop embedded in the CLI process (needs provider auth in env).

## What each turn loads (context/memory)

- **Runtime-injected (automatic):** the workspace-root **`AGENTS.md`** loader
  (Quinn's workspace = the vault root), plus root loader stubs
  (`BOOTSTRAP/IDENTITY/SOUL/USER/TOOLS/HEARTBEAT.md`), and the **session history**
  for the `--session-id` (transcripts in `~/.openclaw/agents/quinn/sessions/*.jsonl`,
  live state in `~/.openclaw/state/openclaw.sqlite`).
- **Prompt-driven (Quinn does it mid-turn):** the persona stack
  (`Runtime_Persona/Quinn_*`), `Directives/CORE_DIRECTIVES.md`,
  `Project_State/CURRENT_STATE.md`, and **memory** — `Quinn_Bootstrap.md`
  instructs the model to run `memory-retrieve "<keyword>"` before substantive
  replies (inject as `## Context:`) and `memory-append` after. Nothing pre-stuffs
  memory; the model chooses to. **Fast-start overrides** skip retrieval for bare
  greetings/pings.
- **Emergency fallback:** `~/.openclaw/quinn-cold-start.md` (non-iCloud) is used
  only if the vault is unreachable — not the normal bootstrap.

## Findings worth acting on (independent of E)

- **Secret hygiene:** `quinn-morning-briefing` and `kaizen-review` contain a
  **hard-coded Telegram bot token + chat id in source**. Should move to env/secret file.
- **Heartbeat discrepancy:** prompt says 2h, config says 10m — reconcile.

## Key files
`/opt/homebrew/bin/openclaw`; `~/.openclaw/openclaw.json`;
`~/.openclaw/agents/quinn/{agent,sessions}`; `~/.openclaw/state/openclaw.sqlite`;
`~/Library/LaunchAgents/ai.openclaw.gateway.plist`;
`OpenClaw_Agent/{AGENTS.md, Runtime_Persona/Quinn_Bootstrap.md}`;
`OpenClaw_Sandbox/scripts/{quinn-quell-team-checkin, quinn-email-inbox, memory-retrieve}`.
