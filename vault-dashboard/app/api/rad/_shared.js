import fs from 'fs';
import path from 'path';
import os from 'os';

export const VAULT_ROOT = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Obsidian',
  'VisionAppDev'
);
export const RAD_DIR = path.join(VAULT_ROOT, 'RAD');
export const REGISTRY_PATH = path.join(VAULT_ROOT, 'Registries', 'Project_Registry.md');

export const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// Formal pipeline stages, per RAD_Integration_Plan_for_Sonnet5.md §2. This is
// RAD's own vocabulary — kept verbatim, not reinvented.
export const LIFECYCLE_VALUES = [
  'Idea',
  'Planning',
  'In Design',
  'In Development',
  'Internal Testing',
  'TestFlight',
  'Preparing Submission',
  'In App Review',
  'Approved',
  'Released',
  'Patch in Progress',
  'On Hold',
  'Archived',
];

export const CLASSIFICATION_VALUES = ['Mission App', 'Pipeline App', 'Experimental App'];

// Only these two values are in real use across the vault today (checked
// 2026-07-10) — kept minimal rather than inventing an "At Risk" tier nobody
// asked for.
export const HEALTH_VALUES = ['On Track', 'Blocked'];

// All frontmatter fields except structural/auto-managed ones (slug is the
// filename itself; note is the cross-link, managed by migration/linking, not
// hand-edited here; last_updated is auto-stamped on every write).
export const EDITABLE_FIELDS = [
  'name',
  'aliases',
  'lifecycle_status',
  'health_status',
  'health_issues',
  'app_classification',
  'classification_rationale',
  'priority',
  'platforms',
  'bundle_id',
  'repository_url',
  'target_launch_date',
  'days_until_launch',
  'current_build_number',
  'current_app_store_version',
  'app_store_state',
  'release_state',
  'blocker',
  'current_milestone',
  'next_action',
  'next_action_owner',
  'next_action_due',
  'patch_needed',
  'is_test_project',
  'needs_marketing_export',
  'source_experiment_id',
];

const REQUIRED_SECTIONS = ['About', 'Planning Notes', 'Open Tasks', 'Version History', 'Marketing'];
export { REQUIRED_SECTIONS };

const BOOL_FIELDS = new Set(['patch_needed', 'is_test_project', 'needs_marketing_export']);
const LIST_FIELDS = new Set(['aliases', 'platforms', 'health_issues']);

function parseYamlValue(key, raw) {
  const trimmed = raw.trim();
  if (BOOL_FIELDS.has(key)) return trimmed === 'true';
  if (LIST_FIELDS.has(key)) {
    if (!trimmed) return [];
    try {
      return JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (key === 'days_until_launch') {
    return trimmed === '' ? null : Number(trimmed);
  }
  // Values written by the Phase 1 migration wrap anything with special chars
  // in a JSON string (e.g. "[[Stare&Share]]", "2026-06-30T00:00:00Z").
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const fm = {};
  if (!match) return fm;
  match[1].split('\n').forEach((line) => {
    if (!line.trim()) return;
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    fm[key] = parseYamlValue(key, value);
  });
  return fm;
}

export function parseSections(content) {
  const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
  const sections = {};
  const headingRegex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingRegex)];
  matches.forEach((m, i) => {
    const heading = m[1].trim();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[heading] = body.slice(start, end).trim();
  });
  return sections;
}

export function parseOpenTasks(sectionText) {
  if (!sectionText) return [];
  const lines = sectionText.split('\n');
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/^-\s*\[( |x|X)\]\s*(.+)$/);
    if (m) tasks.push({ done: m[1].toLowerCase() === 'x', text: m[2].trim() });
  }
  return tasks;
}

export function serializeOpenTasks(tasks) {
  if (!tasks || tasks.length === 0) return '*No open tasks recorded in RAD for this project.*';
  return tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n');
}

export function listRadSlugs() {
  if (!fs.existsSync(RAD_DIR)) return [];
  return fs
    .readdirSync(RAD_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.md'))
    .map((d) => d.name.replace(/\.md$/, ''));
}

export function radFilePath(slug) {
  return path.join(RAD_DIR, `${slug}.md`);
}

// days_until_launch used to be a separately-stored frontmatter field that
// silently drifted from target_launch_date whenever the date changed without
// someone remembering to also update the count (found 2026-07-10 on PeriPal:
// target_launch_date had moved to a future date but days_until_launch still
// read -99). Deriving it live removes the drift entirely.
export function computeDaysUntilLaunch(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetMidnight - todayMidnight) / 86400000);
}

export function safeSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const base = path.basename(slug);
  if (base !== slug || base.includes('.')) return null;
  return base;
}

export function parseRadProject(slug, content, stat) {
  const fm = parseFrontmatter(content);
  const sections = parseSections(content);
  return {
    slug,
    name: fm.name || slug,
    aliases: fm.aliases || [],
    lifecycle_status: fm.lifecycle_status || '',
    health_status: fm.health_status || '',
    health_issues: fm.health_issues || [],
    app_classification: fm.app_classification || '',
    classification_rationale: fm.classification_rationale || '',
    priority: fm.priority || '',
    platforms: fm.platforms || [],
    bundle_id: fm.bundle_id || '',
    repository_url: fm.repository_url || '',
    target_launch_date: fm.target_launch_date || '',
    days_until_launch: computeDaysUntilLaunch(fm.target_launch_date),
    current_build_number: fm.current_build_number || '',
    current_app_store_version: fm.current_app_store_version || '',
    app_store_state: fm.app_store_state || '',
    release_state: fm.release_state || '',
    blocker: fm.blocker || '',
    current_milestone: fm.current_milestone || '',
    next_action: fm.next_action || '',
    next_action_owner: fm.next_action_owner || '',
    next_action_due: fm.next_action_due || '',
    patch_needed: !!fm.patch_needed,
    is_test_project: !!fm.is_test_project,
    needs_marketing_export: !!fm.needs_marketing_export,
    source_experiment_id: fm.source_experiment_id || '',
    note: fm.note || '',
    last_updated: fm.last_updated || '',
    sections,
    openTasks: parseOpenTasks(sections['Open Tasks']),
    modifiedAt: stat.mtime,
  };
}

// Replaces one frontmatter `key: value` line in place, adding it if missing.
// Mirrors /api/incubator/update's approach exactly.
export function writeFrontmatterField(content, key, rawValue) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return content;
  let lines = match[1].split('\n');
  let found = false;
  const serialized = serializeYamlValue(key, rawValue);
  lines = lines.map((line) => {
    if (line.trim().startsWith(`${key}:`)) {
      found = true;
      return `${key}: ${serialized}`;
    }
    return line;
  });
  if (!found) lines.push(`${key}: ${serialized}`);
  const newFm = lines.join('\n');
  return content.replace(match[1], newFm);
}

function serializeYamlValue(key, value) {
  if (BOOL_FIELDS.has(key)) return value ? 'true' : 'false';
  if (LIST_FIELDS.has(key)) return JSON.stringify(Array.isArray(value) ? value : []);
  if (value === null || value === undefined || value === '') return '';
  const s = String(value);
  if (/[:#"']/.test(s) || s !== s.trim()) return JSON.stringify(s);
  return s;
}

// Replaces one `## Heading` section body in place; appends it if missing.
// Same pattern as the marketing app-profile writeSection.
export function writeSection(content, heading, newBody) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // NOTE: no 'm' flag — see app/api/marketing/_shared.js writeSection for
  // the full explanation of this exact bug class (found 2026-07-08).
  const sectionRegex = new RegExp(`(##\\s*${escaped}\\s*\\n)([\\s\\S]*?)(?=\\n##\\s|$)`);
  const replacement = `$1${newBody.trim()}\n`;
  if (sectionRegex.test(content)) {
    return content.replace(sectionRegex, replacement);
  }
  return content.trimEnd() + `\n\n## ${heading}\n${newBody.trim()}\n`;
}

export function appendPlanningNote(content, note, date) {
  const sections = parseSections(content);
  const existing = sections['Planning Notes'] || '';
  const isEmpty = !existing || /^\*No planning notes recorded in RAD\.\*$/.test(existing.trim());
  const line = `\n\n[${date}] ${note}`;
  const newBody = isEmpty ? `[${date}] ${note}` : existing + line;
  return writeSection(content, 'Planning Notes', newBody);
}
