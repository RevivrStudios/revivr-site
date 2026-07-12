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

// Assistant / Claude API.
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-5';
export const BRIEFING_MODEL = process.env.BRIEFING_MODEL || 'claude-haiku-4-5-20251001';

// Auth: when DASHBOARD_TOKEN is set, all pages and APIs require it
// (cookie or Authorization header). Unset = open access for local dev.
export const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';

// How long after the last heartbeat an agent is still considered active.
export const HEARTBEAT_STALE_MINUTES = parseInt(process.env.HEARTBEAT_STALE_MINUTES || '15', 10);
