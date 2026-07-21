import os from 'os';
import path from 'path';

// Central configuration for the Revivr Operations Dashboard.
// Every machine-specific path is overridable via environment variables
// (see .env.example) so the dashboard can run on any host — Mac Studio,
// MiniTower, a laptop, or a cloud container — without code edits.

const HOME = os.homedir();

export const VAULT_PATH =
  process.env.VAULT_PATH ||
  path.join(HOME, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev');

export const VECTOR_MCP_DIR =
  process.env.VECTOR_MCP_DIR ||
  path.join(HOME, '.gemini', 'antigravity', 'mcp', 'obsidian-vector-mcp');

export const TURBOVAULT_BINARY =
  process.env.TURBOVAULT_BINARY ||
  path.join(HOME, '.gemini', 'antigravity', 'mcp', 'turbovault-mcp', 'turbovault');

export const CHROMA_DB_PATH =
  process.env.CHROMA_DB_PATH || path.join(VECTOR_MCP_DIR, 'chroma_db');

export const RAD_COMMANDS_DIR =
  process.env.RAD_COMMANDS_DIR ||
  path.join(
    HOME, 'Library', 'Containers', 'com.revivrstudios.RAD',
    'Data', 'Library', 'Application Support', 'RADCommands'
  );

// Vault sub-locations used across the dashboard.
export const INCUBATOR_DIR = path.join(VAULT_PATH, 'Incubator');
export const REPORTS_DIR = path.join(VAULT_PATH, 'Reports');
export const DRIFT_FILE = path.join(VAULT_PATH, 'Trackers', 'SDK Version & API Drift Tracker.md');
export const PROJECT_REGISTRY_FILE = path.join(VAULT_PATH, 'Registries', 'Project_Registry.md');
export const HANDOFF_LOG_FILE = path.join(VAULT_PATH, 'Registries', 'Handoff_Log.md');
export const FAILURE_MODES_FILE = path.join(VAULT_PATH, 'Trackers', 'Known Failure Modes.md');
export const AWARENESS_ARCHIVE_DIR = path.join(VAULT_PATH, 'Awareness');

// Dashboard-local mutable data (threads, problems, briefings, status, logs).
// Lives inside the dashboard folder by default so it travels with the install,
// and is gitignored — it is runtime state, not source.
export const DATA_DIR =
  process.env.DASHBOARD_DATA_DIR || path.join(process.cwd(), 'data');

export const THREADS_DIR = path.join(DATA_DIR, 'assistant', 'threads');
export const PROBLEMS_DIR = path.join(DATA_DIR, 'problems');
export const BRIEFINGS_DIR = path.join(DATA_DIR, 'awareness', 'briefings');
export const FEED_ITEMS_DIR = path.join(DATA_DIR, 'awareness', 'items');
export const FEEDS_CONFIG_FILE = path.join(DATA_DIR, 'awareness', 'feeds.json');
export const AGENT_STATUS_FILE = path.join(DATA_DIR, 'status', 'agents.json');
export const ACTION_LOG_FILE = path.join(DATA_DIR, 'logs', 'actions.jsonl');
export const APPS_CONFIG_FILE = path.join(DATA_DIR, 'marketing', 'apps.json');
export const CAMPAIGNS_DIR = path.join(DATA_DIR, 'marketing', 'campaigns');
// Country storefront for public App Store review feeds.
export const APP_STORE_COUNTRY = process.env.APP_STORE_COUNTRY || 'us';

// App Store Connect CLI (github.com/rorkai/App-Store-Connect-CLI). Already
// installed + authenticated (file-based creds, runs headless). Used read-only
// to auto-populate app_store_id in the marketing vault profiles. Absolute path
// so the next-server LaunchAgent (minimal PATH) can invoke it; env-overridable.
export const ASC_BIN = process.env.ASC_BIN || '/opt/homebrew/bin/asc';

// Business Vitals (App Store Connect analytics/sales). The modern per-app
// Analytics Reports API needs no vendor number but must be provisioned once
// (ONGOING request) before Apple generates data. Set ASC_VENDOR_NUMBER to also
// pull legacy Sales & Trends (units/proceeds) immediately. Both degrade
// gracefully — the UI shows a setup state rather than erroring when absent.
export const ASC_VENDOR = process.env.ASC_VENDOR_NUMBER || '';
export const ASC_VITALS_CACHE = path.join(DATA_DIR, 'asc', 'vitals.json');

// Social performance cache (marketing outcome loop): per-post X public_metrics
// pulled for published tweets, ranked so "what actually landed" feeds back into
// what to make next. Cached because Bearer reads are rate-limited + per-post.
export const SOCIAL_PERF_CACHE = path.join(DATA_DIR, 'marketing', 'performance.json');

// Renewals source of truth: cert / subscription / domain / membership dates.
// A markdown table in the shared Infrastructure folder (sibling of this
// dashboard), read live — "glass, not storage". Machines/drives stay in
// STUDIO_NETWORK_REGISTRY.md; this file is dates-and-costs only.
export const RENEWALS_FILE =
  process.env.RENEWALS_FILE ||
  path.join(
    HOME, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian',
    'OpenClaw_Agent', 'Infrastructure', 'RENEWALS.md'
  );

// Assistant / Claude API.
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || 'claude-opus-4-8';
export const BRIEFING_MODEL = process.env.BRIEFING_MODEL || 'claude-opus-4-8';

// Quinn integration (Phase 3): the assistant reasons as Quinn using its persona
// and its persistent memory. RUNTIME_PERSONA_DIR holds the identity markdown;
// QUINN_SCRIPTS_DIR holds the deterministic memory-retrieve/append scripts.
// Both live in the OpenClaw_Agent vault (sibling of this dashboard); paths are
// env-overridable so the dashboard still runs where Quinn's vault isn't synced.
const OPENCLAW_AGENT_ROOT = path.join(
  HOME, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'OpenClaw_Agent'
);
export const RUNTIME_PERSONA_DIR =
  process.env.RUNTIME_PERSONA_DIR || path.join(OPENCLAW_AGENT_ROOT, 'Runtime_Persona');
export const QUINN_SCRIPTS_DIR =
  process.env.QUINN_SCRIPTS_DIR || path.join(OPENCLAW_AGENT_ROOT, 'OpenClaw_Sandbox', 'scripts');

// Assistant backend (Option E). 'claude' = the in-dashboard Anthropic loop
// (default). 'quinn' = delegate each turn to the live OpenClaw Quinn agent via
// `openclaw agent` (same headless call the cron scripts use), automatically
// falling back to the Claude loop if the gateway is unreachable.
export const ASSISTANT_BACKEND = process.env.ASSISTANT_BACKEND || 'claude';
export const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '/opt/homebrew/bin/openclaw';
export const QUINN_AGENT_ID = process.env.QUINN_AGENT_ID || 'quinn';
export const QUINN_THINKING = process.env.QUINN_THINKING || 'low';

// Problems → Operating Board sync (Phase 3B). The board lives in the
// OpenClaw_Agent vault (a different root than VAULT_PATH/VisionAppDev), so
// writes are confined to AGENT_VAULT_PATH. One-way mirror: the dashboard's
// data/problems store stays authoritative; only a marker-delimited block in
// the board is generated.
export const AGENT_VAULT_PATH = process.env.AGENT_VAULT_PATH || OPENCLAW_AGENT_ROOT;
export const OPERATING_BOARD_FILE =
  process.env.OPERATING_BOARD_FILE ||
  path.join(AGENT_VAULT_PATH, 'OpenClaw_Sandbox', 'Company_Handbook', 'Revivr_Operating_Board.md');

// Auth: when DASHBOARD_TOKEN is set, all pages and APIs require it
// (cookie or Authorization header). Unset = open access for local dev.
export const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';

// How long after the last heartbeat an agent is still considered active.
export const HEARTBEAT_STALE_MINUTES = parseInt(process.env.HEARTBEAT_STALE_MINUTES || '15', 10);

// Fleet tracker: the dashboard glasses a session board — one YAML-frontmatter
// file per running AI session (Claude / Codex / Antigravity), heartbeated by
// session-board.sh on each machine. The folder is the cross-machine sync point;
// point FLEET_SESSIONS_DIR at whatever is synced to this host (an iCloud-synced
// vault folder, or a Tailscale/git-pulled repo). Default lives in the
// OpenClaw_Agent vault so all Macs write to one iCloud-synced location.
export const FLEET_SESSIONS_DIR =
  process.env.FLEET_SESSIONS_DIR || path.join(OPENCLAW_AGENT_ROOT, 'Fleet', 'sessions', 'active');

// Real local session detection: Claude Code writes every session to disk here,
// so the dashboard host reads its OWN live sessions directly (no emitter). Other
// machines still report via the synced session board above.
export const CLAUDE_PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR || path.join(HOME, '.claude', 'projects');
// Codex stores sessions as ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl; the
// first `session_meta` line carries cwd + git (branch/commit).
export const CODEX_SESSIONS_DIR = process.env.CODEX_SESSIONS_DIR || path.join(HOME, '.codex', 'sessions');
// Friendly name for THIS machine on the board. Empty = derive from ComputerName.
export const FLEET_MACHINE_NAME = process.env.FLEET_MACHINE_NAME || '';
// Only surface sessions touched within this window (minutes) — "running / today",
// not every historical conversation.
export const FLEET_ACTIVE_WINDOW_MIN = parseInt(process.env.FLEET_ACTIVE_WINDOW_MIN || '1440', 10);
