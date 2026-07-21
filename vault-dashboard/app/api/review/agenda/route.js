import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { GET as getOpsHealth } from '../../ops/health/route';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const VAULT_ROOT = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian');
const HANDOFF_LOG_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'Registries', 'Handoff_Log.md');
const WEEKLY_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'Registries', 'WEEKLY.md');
const NOW_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'NOW.md');
const INCUBATOR_DIR = path.join(VAULT_ROOT, 'VisionAppDev', 'Incubator');

const FALLBACK_LOOKBACK_DAYS = 14;

// Handoff_Log headers vary: "### 🔄 Handoff — 2026-07-08 19:55 — Fable 5"
// or "### 🔄 Handoff — 2026-07-08 — Sonnet 5" (no time). Capture the date only.
const HEADER_RE = /^###\s*🔄\s*Handoff\s*—\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\s*—\s*(.+)$/gm;

function parseHandoffNextSteps(sinceDate) {
  if (!fs.existsSync(HANDOFF_LOG_PATH)) return [];
  const content = fs.readFileSync(HANDOFF_LOG_PATH, 'utf8');
  const headers = [...content.matchAll(HEADER_RE)];
  const items = [];

  headers.forEach((h, i) => {
    const entryDate = h[1];
    if (entryDate < sinceDate) return;
    const agent = h[2].trim();
    const blockStart = h.index;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);

    const projectMatch = block.match(/\*\*Project:\*\*\s*(.+)/);
    const project = projectMatch ? projectMatch[1].trim() : 'Unknown project';

    const nextStepsMatch = block.match(/#### 📍 Recommended Next Steps\s*\n([\s\S]*?)(?=\n#### |\n---|\n$|$)/);
    if (!nextStepsMatch) return;
    const bulletLines = [...nextStepsMatch[1].matchAll(/^\d+\.\s+(.+)$/gm)];
    bulletLines.forEach((b, j) => {
      items.push({
        id: `${entryDate}-${i}-${j}`,
        entryDate,
        agent,
        project,
        text: b[1].trim(),
      });
    });
  });

  // Handoff_Log is append-only newest-first (new entries prepended to the
  // top), so headers.matchAll already yields newest-first order — no
  // reverse needed (a reverse here previously produced oldest-first output).
  return items;
}

function lastWeeklyDate() {
  if (!fs.existsSync(WEEKLY_PATH)) return null;
  const content = fs.readFileSync(WEEKLY_PATH, 'utf8');
  const match = content.match(/^##\s*Week of\s*(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

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

function repoHygieneForBet(bet) {
  if (!bet.repo) return null;
  if (!fs.existsSync(bet.repo)) {
    return { title: bet.title, repo: bet.repo, state: 'unavailable', detail: 'Path not reachable (unmounted volume or moved)' };
  }
  try {
    const dirty = execSync(`git -C ${JSON.stringify(bet.repo)} status --porcelain`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean).length;
    const lastCommit = execSync(`git -C ${JSON.stringify(bet.repo)} log -1 --format=%cs`, { encoding: 'utf8' }).trim();
    return { title: bet.title, repo: bet.repo, state: 'ok', dirtyFiles: dirty, lastCommit: lastCommit || 'no commits' };
  } catch (error) {
    return { title: bet.title, repo: bet.repo, state: 'unavailable', detail: error.message.split('\n')[0] };
  }
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

export async function GET() {
  try {
    const lastWeekly = lastWeeklyDate();
    const sinceDate = lastWeekly || isoDaysAgo(FALLBACK_LOOKBACK_DAYS);

    const nextSteps = parseHandoffNextSteps(sinceDate);
    const bets = parseNowBets();
    const repoHygiene = bets.map(repoHygieneForBet).filter(Boolean);
    const summary = statusSummary();

    let healthReds = [];
    try {
      const healthRes = await getOpsHealth();
      const healthData = await healthRes.json();
      healthReds = (healthData.checks || []).filter((c) => c.state !== 'ok');
    } catch (error) {
      healthReds = [{ name: 'Outcome Health', state: 'error', detail: `Could not load: ${error.message}` }];
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 Sun ... 5 Fri, 6 Sat
    const isFriToSun = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    const weeklyStale = !lastWeekly || lastWeekly < isoDaysAgo(7);
    const dueForReview = isFriToSun && weeklyStale;

    // Overdue is day-of-week-independent — the ritual can be missed on any
    // day, and the banner must say so, not stay silent outside its Fri–Sun window.
    const daysSinceLastWeekly = lastWeekly
      ? Math.floor((today.getTime() - new Date(lastWeekly).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const weeksOverdue = daysSinceLastWeekly !== null ? Math.floor(daysSinceLastWeekly / 7) : null;
    const overdue = weeklyStale;

    return Response.json(
      {
        dueForReview,
        overdue,
        weeksOverdue,
        sinceDate,
        lastWeeklyDate: lastWeekly,
        nextSteps,
        repoHygiene,
        statusSummary: summary,
        healthReds,
        nowBets: bets,
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
