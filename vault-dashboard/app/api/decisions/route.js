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
const HANDOFF_LOG_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'Registries', 'Handoff_Log.md');
const DECISIONS_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'Registries', 'DECISIONS.md');

const FILE_HEADER = '# Decision Index (append-only; auto-extracted from Handoff_Log + manual strategy entries)\n\n| Date | Decision | Why | Source |\n|---|---|---|---|\n';

// Same date-with-or-without-time header format as the Phase 4 review parser.
const HEADER_RE = /^###\s*🔄\s*Handoff\s*—\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\s*—\s*(.+)$/gm;

function escapeCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function unescapeCell(value) {
  return String(value || '').replace(/\\\|/g, '|').trim();
}

// Real decision bullets overwhelmingly follow "<what we chose> — <why>" —
// split on the first em-dash rather than guessing at "because"/"since".
function splitDecisionWhy(text) {
  const idx = text.indexOf(' — ');
  if (idx === -1) return { decision: text.trim(), why: '' };
  return { decision: text.slice(0, idx).trim(), why: text.slice(idx + 3).trim() };
}

function parseDecisionsTable(content) {
  const rows = [];
  const lines = content.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (/^\|\s*Date\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue; // separator row
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(unescapeCell);
    if (cells.length < 4) continue;
    rows.push({ date: cells[0], decision: cells[1], why: cells[2], source: cells[3] });
  }
  return rows;
}

function dedupKey(date, decisionText) {
  return `${date}::${String(decisionText).slice(0, 40).toLowerCase()}`;
}

function extractHandoffDecisions() {
  if (!fs.existsSync(HANDOFF_LOG_PATH)) return [];
  const content = fs.readFileSync(HANDOFF_LOG_PATH, 'utf8');
  const headers = [...content.matchAll(HEADER_RE)];
  const items = [];

  headers.forEach((h, i) => {
    const entryDate = h[1];
    const agent = h[2].trim();
    const blockStart = h.index;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);

    const decisionsMatch = block.match(/#### 🧠 Key Decisions Made\s*\n([\s\S]*?)(?=\n#### |\n---|\n$|$)/);
    if (!decisionsMatch) return;

    const bullets = [...decisionsMatch[1].matchAll(/^-\s+(.+)$/gm)];
    bullets.forEach((b) => {
      const { decision, why } = splitDecisionWhy(b[1].trim());
      if (!decision) return;
      items.push({ date: entryDate, decision, why, source: `Handoff_Log ${entryDate} — ${agent}` });
    });
  });

  // Handoff_Log is append-only newest-first (new entries prepended to the
  // top), so headers.matchAll already yields newest-first order — no
  // reverse needed. (An earlier version of this and the Phase 4 agenda
  // parser incorrectly reversed this, producing oldest-first output.)
  return items;
}

function insertRowsAfterHeader(content, rowLines) {
  if (rowLines.length === 0) return content;
  const separatorRe = /^\|\s*-+\s*\|.*$/m;
  const match = content.match(separatorRe);
  if (!match) {
    return FILE_HEADER + rowLines.join('\n') + '\n';
  }
  const insertAt = match.index + match[0].length;
  return content.slice(0, insertAt) + '\n' + rowLines.join('\n') + content.slice(insertAt);
}

function toRowLine({ date, decision, why, source }) {
  return `| ${escapeCell(date)} | ${escapeCell(decision)} | ${escapeCell(why)} | ${escapeCell(source)} |`;
}

export async function GET() {
  try {
    if (!fs.existsSync(DECISIONS_PATH)) {
      return Response.json({ exists: false, decisions: [] }, { headers: noStoreHeaders });
    }
    const content = fs.readFileSync(DECISIONS_PATH, 'utf8');
    return Response.json({ exists: true, decisions: parseDecisionsTable(content) }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const existingContent = fs.existsSync(DECISIONS_PATH) ? fs.readFileSync(DECISIONS_PATH, 'utf8') : FILE_HEADER;
    const existingRows = parseDecisionsTable(existingContent);
    const existingKeys = new Set(existingRows.map((r) => dedupKey(r.date, r.decision)));

    if (body.action === 'extract') {
      const candidates = extractHandoffDecisions();
      const newRows = [];
      for (const c of candidates) {
        const key = dedupKey(c.date, c.decision);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        newRows.push(c);
      }
      const newContent = insertRowsAfterHeader(existingContent, newRows.map(toRowLine));
      if (newRows.length > 0) {
        fs.mkdirSync(path.dirname(DECISIONS_PATH), { recursive: true });
        fs.writeFileSync(DECISIONS_PATH, newContent, 'utf8');
      } else if (!fs.existsSync(DECISIONS_PATH)) {
        fs.mkdirSync(path.dirname(DECISIONS_PATH), { recursive: true });
        fs.writeFileSync(DECISIONS_PATH, existingContent, 'utf8');
      }
      return Response.json({ success: true, added: newRows.length, totalCandidates: candidates.length }, { headers: noStoreHeaders });
    }

    if (body.action === 'add') {
      const decision = (body.decision || '').trim();
      if (!decision) {
        return Response.json({ error: 'A decision needs its own text.' }, { status: 400, headers: noStoreHeaders });
      }
      const row = {
        date: (body.date || new Date().toISOString().split('T')[0]).trim(),
        decision,
        why: (body.why || '').trim(),
        source: (body.source || 'Manual entry').trim(),
      };
      const newContent = insertRowsAfterHeader(existingContent, [toRowLine(row)]);
      fs.mkdirSync(path.dirname(DECISIONS_PATH), { recursive: true });
      fs.writeFileSync(DECISIONS_PATH, newContent, 'utf8');
      return Response.json({ success: true, added: 1 }, { headers: noStoreHeaders });
    }

    return Response.json({ error: 'Unknown action. Use "extract" or "add".' }, { status: 400, headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
