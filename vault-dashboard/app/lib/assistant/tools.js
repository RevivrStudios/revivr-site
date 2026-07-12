import fs from 'fs';
import path from 'path';
import {
  VAULT_PATH,
  PROJECT_REGISTRY_FILE,
  HANDOFF_LOG_FILE,
  FAILURE_MODES_FILE,
  DRIFT_FILE,
  REPORTS_DIR,
} from '@/app/lib/config';
import { safeReadFile } from '@/app/lib/vaultFs';
import { readActions } from '@/app/lib/actionlog';
import { readAgentStatuses } from '@/app/lib/heartbeat';

// Vault paths arriving from the model are untrusted — resolve and confine to the vault root.
function resolveVaultPath(relPath) {
  const resolved = path.resolve(VAULT_PATH, relPath);
  if (resolved !== VAULT_PATH && !resolved.startsWith(VAULT_PATH + path.sep)) {
    throw new Error(`Path escapes the vault: ${relPath}`);
  }
  return resolved;
}

function walkMarkdownFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdownFiles(full, results);
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

export function parseProjectRegistry(content) {
  // Registry table columns: | App Name | Bundle ID | Current Stage | Local Absolute Path | Check-In File |
  const rows = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|') || t.startsWith('|-') || /^\|\s*App Name/i.test(t)) continue;
    const cells = t.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length >= 5) {
      rows.push({
        appName: cells[0], bundleId: cells[1], stage: cells[2],
        localPath: cells[3], checkInFile: cells[4],
      });
    }
  }
  return rows;
}

export const TOOL_DEFINITIONS = [
  {
    name: 'list_projects',
    description: 'List every app project from the vault Project Registry, with its current stage, local path, and check-in (state) file. Call this to find a project before reading its context.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_project_context',
    description: 'Load the full working context for one project: its registry row, its live state file (current assumptions, near-term focus, outstanding to-dos), and the most recent handoff-log entry. Call this before discussing or debugging a specific app so the user never has to re-explain it.',
    input_schema: {
      type: 'object',
      properties: {
        app_name: { type: 'string', description: 'App name exactly as it appears in the Project Registry (use list_projects first if unsure).' },
      },
      required: ['app_name'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_vault_file',
    description: 'Read a file from the Obsidian vault by vault-relative path (e.g. "Projects/PeriPal.md" or "Modules/Agent_Command_Center.md").',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the vault root.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_vault',
    description: 'Full-text search across all markdown files in the vault. Returns matching files with surrounding line snippets. Use for finding known failure modes, prior reports, techniques, or any past knowledge.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Case-insensitive substring or simple phrase to search for.' },
        max_results: { type: 'integer', description: 'Maximum matching files to return (default 8).' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_known_failures_and_drift',
    description: 'Read the Known Failure Modes registry and the SDK Version & API Drift Tracker. Call this when debugging so past solved failures are not re-diagnosed from scratch.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_dashboard_status',
    description: 'Current operational status: live agent heartbeats (which agents/machines are active) and the most recent dashboard actions from the audit log.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_marketing_snapshot',
    description: 'Current marketing state: the app portfolio (status, App Store IDs, launch dates), active campaigns/launches, and the tracked resource registry (machines, certificates, subscriptions — including anything expiring soon). Call this for marketing, launch-planning, or logistics questions.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'save_report',
    description: 'Save a markdown report of this session or investigation into the vault Reports/ folder. Never overwrites: fails if the filename already exists.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename ending in .md, e.g. "2026-07-12 - PeriPal crash investigation.md".' },
        content: { type: 'string', description: 'Full markdown content of the report.' },
      },
      required: ['filename', 'content'],
      additionalProperties: false,
    },
  },
];

export async function executeTool(name, input) {
  switch (name) {
    case 'list_projects': {
      const registry = await safeReadFile(PROJECT_REGISTRY_FILE);
      if (!registry) return 'Project Registry not found or empty (is VAULT_PATH configured and the vault synced on this machine?).';
      const rows = parseProjectRegistry(registry);
      return JSON.stringify(rows, null, 2);
    }

    case 'get_project_context': {
      const registry = await safeReadFile(PROJECT_REGISTRY_FILE);
      const rows = parseProjectRegistry(registry);
      const row = rows.find((r) => r.appName.toLowerCase() === input.app_name.toLowerCase())
        || rows.find((r) => r.appName.toLowerCase().includes(input.app_name.toLowerCase()));
      if (!row) return `No project named "${input.app_name}" in the registry. Known projects: ${rows.map((r) => r.appName).join(', ') || '(none)'}`;

      // The check-in file cell is usually a wikilink or relative path.
      const stateName = row.checkInFile.replace(/[[\]]/g, '').trim();
      const candidates = [stateName, `Projects/${stateName}`, `Projects/${stateName}.md`, `${stateName}.md`];
      let stateContent = '';
      for (const c of candidates) {
        try { stateContent = await safeReadFile(resolveVaultPath(c)); } catch { continue; }
        if (stateContent) break;
      }

      const handoff = await safeReadFile(HANDOFF_LOG_FILE);
      const handoffTop = handoff.split('\n').slice(0, 50).join('\n');

      return [
        `## Registry entry`, JSON.stringify(row, null, 2),
        `\n## Project state file (${stateName})`, stateContent || '(state file not found)',
        `\n## Most recent handoff (top of Handoff_Log.md)`, handoffTop || '(handoff log not found)',
      ].join('\n');
    }

    case 'read_vault_file': {
      const content = await safeReadFile(resolveVaultPath(input.path));
      return content || `File not found or empty: ${input.path}`;
    }

    case 'search_vault': {
      const maxResults = input.max_results || 8;
      const needle = input.query.toLowerCase();
      const files = walkMarkdownFiles(VAULT_PATH);
      const hits = [];
      for (const file of files) {
        if (hits.length >= maxResults) break;
        const content = await safeReadFile(file);
        if (!content) continue;
        const lines = content.split('\n');
        const matchIdx = lines.findIndex((l) => l.toLowerCase().includes(needle));
        if (matchIdx === -1) continue;
        const snippet = lines.slice(Math.max(0, matchIdx - 2), matchIdx + 3).join('\n');
        hits.push({ file: path.relative(VAULT_PATH, file), line: matchIdx + 1, snippet });
      }
      return hits.length ? JSON.stringify(hits, null, 2) : `No matches for "${input.query}".`;
    }

    case 'get_known_failures_and_drift': {
      const failures = await safeReadFile(FAILURE_MODES_FILE);
      const drift = await safeReadFile(DRIFT_FILE);
      return [
        '## Known Failure Modes', failures || '(not found)',
        '\n## SDK Version & API Drift Tracker', drift || '(not found)',
      ].join('\n');
    }

    case 'get_dashboard_status': {
      const agents = await readAgentStatuses();
      const actions = await readActions(20);
      return JSON.stringify({ agents, recentActions: actions }, null, 2);
    }

    case 'get_marketing_snapshot': {
      const { listApps, listCampaigns } = await import('@/app/lib/marketing');
      const { listResources, expiryInfo } = await import('@/app/lib/resources');
      const [apps, campaigns, resources] = await Promise.all([listApps(), listCampaigns(), listResources()]);
      return JSON.stringify({
        apps,
        campaigns: campaigns.map(({ body, ...c }) => ({ ...c, summary: (body || '').slice(0, 200) })),
        resources: resources.map((r) => ({ ...r, ...expiryInfo(r) })),
      }, null, 2);
    }

    case 'save_report': {
      if (!input.filename.endsWith('.md')) return 'Error: filename must end in .md';
      const target = path.resolve(REPORTS_DIR, path.basename(input.filename));
      if (fs.existsSync(target)) return `Error: ${input.filename} already exists — pick a different name (collision guard).`;
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
      fs.writeFileSync(target, input.content, 'utf-8');
      return `Saved to Reports/${path.basename(input.filename)}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
