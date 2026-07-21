import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const HANDOFF_LOG_PATH = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Obsidian',
  'VisionAppDev',
  'Registries',
  'Handoff_Log.md'
);

// Handoff_Log headers vary: "### 🔄 Handoff — 2026-07-08 19:55 — Fable 5 (...)"
// or "### 🔄 Handoff — 2026-07-08 — Sonnet 5 (...)" (no time).
const HEADER_RE = /^###\s*🔄\s*Handoff\s*—\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\s*—\s*(.+)$/m;
const PROJECT_RE = /\*\*Project:\*\*\s*(.+)/;

function formatAge(mtimeMs) {
  const hours = (Date.now() - mtimeMs) / (1000 * 60 * 60);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function GET() {
  try {
    if (!fs.existsSync(HANDOFF_LOG_PATH)) {
      return Response.json({ exists: false }, { headers: noStoreHeaders });
    }
    const stat = fs.statSync(HANDOFF_LOG_PATH);
    const content = fs.readFileSync(HANDOFF_LOG_PATH, 'utf8');
    const headerMatch = content.match(HEADER_RE);
    if (!headerMatch) {
      return Response.json({ exists: false }, { headers: noStoreHeaders });
    }
    // Handoff_Log is append-only newest-first — the first header match is
    // the most recent entry.
    const blockStart = headerMatch.index;
    const nextHeaderIdx = content.indexOf('\n### ', blockStart + 1);
    const block = content.slice(blockStart, nextHeaderIdx === -1 ? content.length : nextHeaderIdx);
    const projectMatch = block.match(PROJECT_RE);

    return Response.json(
      {
        exists: true,
        agentAndProject: headerMatch[2].trim(),
        project: projectMatch ? projectMatch[1].trim() : null,
        ageLabel: formatAge(stat.mtimeMs),
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return Response.json({ exists: false, error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
