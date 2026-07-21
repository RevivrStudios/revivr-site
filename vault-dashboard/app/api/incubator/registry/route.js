import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const INCUBATOR_DIR = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev', 'Incubator');
const REGISTRY_PATH = path.join(INCUBATOR_DIR, 'EXPERIMENT_REGISTRY.md');

// Returns null for files with no frontmatter block, matching the skip
// behavior of the existing GET /api/incubator route — files like
// INCUBATOR_AGENT_PROMPTS.md are prompt-library docs, not experiments.
function parseFrontmatter(content) {
  const match = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match || !match[1]) return null;
  const data = {};
  match[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  });
  return data;
}

// Mirrors the closure vocabulary used by the Operations site UI (Phase 2 of
// Revivr_Operations_Site_Build_Plan_for_Sonnet5.md): status stays the existing
// idea/queued/active/paused/blocked/archived/promoted enum, bucketed here into
// the four closure states the registry cares about.
function bucketFor(data) {
  if (data.status === 'promoted' || data.lifecycle_stage === 'Shipped') return 'shipped';
  if (data.status === 'archived') return 'killed';
  if (data.status === 'paused') return 'parked';
  return 'active';
}

const SECTION_TITLE = {
  active: '🟢 Active',
  parked: '⏸️ Parked',
  killed: '⚰️ Killed',
  shipped: '🚀 Shipped',
};

function escapeCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export async function POST() {
  try {
    if (!fs.existsSync(INCUBATOR_DIR)) {
      return Response.json({ error: 'Incubator directory not found' }, { status: 404, headers: noStoreHeaders });
    }

    const files = fs
      .readdirSync(INCUBATOR_DIR)
      .filter((f) => f.endsWith('.md') && !f.includes('EXPERIMENT_AGENT') && !f.includes('EXPERIMENT_REGISTRY') && !f.endsWith('-PRD.md'));

    const rows = files
      .map((file) => {
        const content = fs.readFileSync(path.join(INCUBATOR_DIR, file), 'utf8');
        const data = parseFrontmatter(content);
        if (!data) return null;
        return {
          id: data.id || '?',
          name: data.name || file,
          agent: data.active_agent || data.agent || 'Unassigned',
          outcome: data.last_outcome || '',
          revisitWhen: data.revisit_when || '',
          bucket: bucketFor(data),
          file: file.replace(/\.md$/, ''),
        };
      })
      .filter(Boolean);

    rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const buckets = { active: [], parked: [], killed: [], shipped: [] };
    rows.forEach((r) => buckets[r.bucket].push(r));

    const lines = [
      '# Experiment Registry',
      '',
      '<!-- GENERATED from EXP frontmatter — do not hand-edit; edit EXP files or use the Operations site -->',
      '',
      `Regenerated: ${new Date().toISOString()}`,
      '',
    ];

    for (const bucket of ['active', 'parked', 'killed', 'shipped']) {
      const items = buckets[bucket];
      lines.push(`## ${SECTION_TITLE[bucket]} (${items.length})`);
      lines.push('');
      if (items.length === 0) {
        lines.push('*None.*');
      } else {
        lines.push('| ID | Name | Agent | Note | File |');
        lines.push('|---|---|---|---|---|');
        items.forEach((r) => {
          const note = bucket === 'parked' ? r.revisitWhen : r.outcome;
          lines.push(`| ${escapeCell(r.id)} | ${escapeCell(r.name)} | ${escapeCell(r.agent)} | ${note ? escapeCell(note) : '—'} | [[${r.file}]] |`);
        });
      }
      lines.push('');
    }

    fs.writeFileSync(REGISTRY_PATH, lines.join('\n'), 'utf8');

    return Response.json(
      { success: true, counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])) },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
