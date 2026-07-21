import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const VAULT_ROOT = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian');
const WEEKLY_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'Registries', 'WEEKLY.md');
const NOW_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'NOW.md');
const INCUBATOR_DIR = path.join(VAULT_ROOT, 'VisionAppDev', 'Incubator');

const NOW_FIELD_KEYS = ['why_now', 'next_action', 'done_looks_like', 'owner_lane', 'repo', 'started'];

function parseNowBets() {
  if (!fs.existsSync(NOW_PATH)) return [];
  const content = fs.readFileSync(NOW_PATH, 'utf8');
  const headerRegex = /^##\s+\d+\.\s+(.+)$/gm;
  const headers = [...content.matchAll(headerRegex)];
  return headers.map((h, i) => {
    const title = h[1].trim();
    const blockStart = h.index + h[0].length;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);
    const bet = { title };
    for (const key of NOW_FIELD_KEYS) {
      // [ \t]* (not \s*) so an empty value doesn't cross the newline and
      // swallow the start of the next bullet line as its "value".
      const fieldMatch = block.match(new RegExp(`\\*\\*${key}:\\*\\*[ \\t]*(.*)`));
      bet[key] = fieldMatch ? fieldMatch[1].trim() : '';
    }
    return bet;
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match || !match[1]) return null;
  const data = {};
  match[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx !== -1) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return data;
}

function bucketFor(data) {
  if (data.status === 'promoted' || data.lifecycle_stage === 'Shipped') return 'shipped';
  if (data.status === 'archived') return 'killed';
  if (data.status === 'paused') return 'parked';
  return 'active';
}

function statusSummary() {
  if (!fs.existsSync(INCUBATOR_DIR)) return { active: 0, parked: 0, killed: 0, shipped: 0 };
  const files = fs
    .readdirSync(INCUBATOR_DIR)
    .filter((f) => f.endsWith('.md') && !f.includes('EXPERIMENT_AGENT') && !f.includes('EXPERIMENT_REGISTRY') && !f.endsWith('-PRD.md'));
  const summary = { active: 0, parked: 0, killed: 0, shipped: 0 };
  files.forEach((file) => {
    const data = parseFrontmatter(fs.readFileSync(path.join(INCUBATOR_DIR, file), 'utf8'));
    if (!data) return;
    summary[bucketFor(data)] += 1;
  });
  return summary;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const VALID_VERDICTS = new Set(['done', 'dropped', 'carried']);

export async function POST(req) {
  try {
    const body = await req.json();
    const verdicts = Array.isArray(body.verdicts) ? body.verdicts : [];
    const retro = (body.retro || '').trim();

    for (const v of verdicts) {
      if (!v.text || !VALID_VERDICTS.has(v.verdict)) {
        return Response.json({ error: 'Every next-step needs a verdict of done, dropped, or carried' }, { status: 400, headers: noStoreHeaders });
      }
    }

    const bets = parseNowBets();
    const summary = statusSummary();
    const weekOf = todayISO();

    const lines = [];
    lines.push(`## Week of ${weekOf}`);
    lines.push('### Next-step verdicts (from last week)');
    if (verdicts.length === 0) {
      lines.push('*No outstanding next-steps this week.*');
    } else {
      verdicts.forEach((v) => lines.push(`- [${v.verdict}] ${v.text.trim()}`));
    }
    lines.push('### Status changes');
    lines.push(`- Incubator: Active ${summary.active} · Parked ${summary.parked} · Killed ${summary.killed} · Shipped ${summary.shipped}`);
    lines.push('### Retro (5 lines max)');
    lines.push(retro || '*No retro notes recorded.*');
    lines.push("### Next week's NOW");
    if (bets.length === 0) {
      lines.push('*No active bets declared.*');
    } else {
      bets.forEach((bet, i) => lines.push(`${i + 1}. **${bet.title}** — ${bet.next_action || 'no next action set'}`));
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    const entry = lines.join('\n');

    const existing = fs.existsSync(WEEKLY_PATH)
      ? fs.readFileSync(WEEKLY_PATH, 'utf8')
      : '# Weekly Ship Reviews\n\nAppend-only, newest-first. Written from the Operations site `/review` page — the Friday closure ritual.\n\n';

    const firstWeekIdx = existing.search(/^##\s*Week of/m);
    const newContent = firstWeekIdx === -1
      ? `${existing.trimEnd()}\n\n${entry}`
      : existing.slice(0, firstWeekIdx) + entry + '\n' + existing.slice(firstWeekIdx);

    fs.mkdirSync(path.dirname(WEEKLY_PATH), { recursive: true });
    fs.writeFileSync(WEEKLY_PATH, newContent, 'utf8');

    return Response.json({ success: true, weekOf }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
