import fs from 'fs';
import path from 'path';
import { AGENT_VAULT_PATH, OPERATING_BOARD_FILE } from '@/app/lib/config';
import { safeReadFile } from '@/app/lib/vaultFs';
import { listProblems } from '@/app/lib/problems';
import { logAction } from '@/app/lib/actionlog';

// One-way mirror of the dashboard's blocked tickets into a marker-delimited
// region of Revivr_Operating_Board.md. The dashboard's data/problems store is
// authoritative; this block is generated, never hand-edited, and only the text
// BETWEEN the markers is ever rewritten — the human "## Blockers" table and the
// rest of the board are untouched. See docs/PHASE3-problems-operating-board.md.

const BEGIN = '<!-- BEGIN:dashboard-blockers -->';
const END = '<!-- END:dashboard-blockers -->';
const HEADING = '## Blockers (from dashboard — auto-generated, do not edit)';

// Which tickets surface as blockers: explicitly blocked, or open + critical.
function isBlocker(p) {
  return p.status === 'blocked' || (p.status === 'open' && p.severity === 'critical');
}

function cell(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function buildRegion(problems) {
  const rows = problems.filter(isBlocker);
  let body;
  if (rows.length === 0) {
    body = '_No dashboard-tracked blockers._';
  } else {
    body = [
      '| Ticket | Blocker | Project | Severity | Status | Updated |',
      '|---|---|---|---|---|---|',
      ...rows.map((p) => `| ${cell(p.id)} | ${cell(p.title)} | ${cell(p.project) || '—'} | ${cell(p.severity)} | ${cell(p.status)} | ${cell(p.updated)} |`),
    ].join('\n');
  }
  return `${BEGIN}\n${body}\n${END}`;
}

// Regenerate the dashboard-blockers region in the Operating Board. Safe to call
// repeatedly (idempotent). No-op (and no write) when the board is absent or the
// content is unchanged. Returns { ok, changed, reason? }.
export async function syncBlockersToBoard() {
  const boardPath = OPERATING_BOARD_FILE;

  // Confinement: the board must resolve inside the agent vault root.
  const resolved = path.resolve(boardPath);
  if (resolved !== path.resolve(AGENT_VAULT_PATH) && !resolved.startsWith(path.resolve(AGENT_VAULT_PATH) + path.sep)) {
    return { ok: false, reason: 'board path escapes AGENT_VAULT_PATH' };
  }

  const existing = await safeReadFile(boardPath);
  if (!existing) return { ok: false, reason: 'board not found or empty' };

  const region = buildRegion(await listProblems());

  let next;
  const bi = existing.indexOf(BEGIN);
  const ei = existing.indexOf(END);
  if (bi !== -1 && ei !== -1 && ei > bi) {
    next = existing.slice(0, bi) + region + existing.slice(ei + END.length);
  } else {
    next = `${existing.replace(/\s*$/, '')}\n\n${HEADING}\n\n${region}\n`;
  }

  if (next === existing) return { ok: true, changed: false };

  await fs.promises.writeFile(boardPath, next, 'utf-8');
  await logAction({ source: 'problems', action: 'sync-board', label: 'Synced blockers → Operating Board', success: true });
  return { ok: true, changed: true };
}
