import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const VAULT_ROOT = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian');
const NOW_PATH = path.join(VAULT_ROOT, 'VisionAppDev', 'NOW.md');

// Small, curated set of live/flagship apps beyond whatever's in NOW.md —
// this is what actually lets the strip surface the diagnosis's original
// examples (VisionMarkup's orphan branches, SpatialTree's missing git repo)
// instead of only ever showing whatever 3 things are in the active bets.
const STATIC_REPOS = [
  { name: 'VisionMarkup', repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/VisionMarkup' },
  { name: 'SpatialTree', repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/SpatialTree' },
  { name: 'Track Stash', repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/Track Stash' },
  { name: 'PeriPal', repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/PeriPal' },
  { name: 'TeleVisionPrompter', repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/TeleVisionPrompter' },
];

const ORPHAN_BRANCH_MAX_DAYS = 30;

function parseNowBetRepos() {
  if (!fs.existsSync(NOW_PATH)) return [];
  const content = fs.readFileSync(NOW_PATH, 'utf8');
  const headerRegex = /^##\s+\d+\.\s+(.+)$/gm;
  const headers = [...content.matchAll(headerRegex)];
  const out = [];
  headers.forEach((h, i) => {
    const title = h[1].trim();
    const blockStart = h.index + h[0].length;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);
    const repoMatch = block.match(/\*\*repo:\*\*[ \t]*(.*)/);
    const repo = repoMatch ? repoMatch[1].trim() : '';
    if (repo) out.push({ name: title, repo });
  });
  return out;
}

function daysSince(dateStr) {
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function classify(dirtyFiles, days) {
  if (days === null) return 'unknown';
  if ((dirtyFiles > 0 && days > 7) || days > 14) return 'red';
  if (dirtyFiles === 0 && days < 7) return 'green';
  return 'amber';
}

function checkRepo({ name, repo }) {
  if (!fs.existsSync(repo)) {
    return { name, repo, state: 'unavailable', detail: 'Path not reachable (unmounted volume or moved)' };
  }
  if (!fs.existsSync(path.join(repo, '.git'))) {
    // Some Xcode projects nest the real git repo one level deeper, in a
    // child folder sharing the parent's basename (e.g. SpatialTree/SpatialTree/.git)
    // — found 2026-07-10 when this exact shape made SpatialTree read as
    // "no git repository" despite a real, active GitHub repo underneath.
    const nested = path.join(repo, path.basename(repo));
    if (fs.existsSync(path.join(nested, '.git'))) {
      repo = nested;
    } else {
      return { name, repo, state: 'no-git', detail: 'No git repository' };
    }
  }
  try {
    const dirtyFiles = execSync(`git -C ${JSON.stringify(repo)} status --porcelain`, { encoding: 'utf8' })
      .split('\n').filter(Boolean).length;
    const lastCommitDate = execSync(`git -C ${JSON.stringify(repo)} log -1 --format=%cs`, { encoding: 'utf8' }).trim();
    const branchCount = execSync(`git -C ${JSON.stringify(repo)} branch --list`, { encoding: 'utf8' })
      .split('\n').filter((l) => l.trim()).length;

    let orphanBranches = [];
    try {
      const claudeBranches = execSync(
        `git -C ${JSON.stringify(repo)} for-each-ref --format='%(refname:short)|%(committerdate:unix)' refs/heads/claude`,
        { encoding: 'utf8' }
      ).split('\n').filter(Boolean);
      orphanBranches = claudeBranches
        .map((line) => {
          const [branch, ts] = line.split('|');
          const ageDays = Math.floor((Date.now() / 1000 - Number(ts)) / 86400);
          return { branch, ageDays };
        })
        .filter((b) => b.ageDays > ORPHAN_BRANCH_MAX_DAYS);
    } catch {
      orphanBranches = [];
    }

    const days = daysSince(lastCommitDate);
    return {
      name,
      repo,
      state: classify(dirtyFiles, days),
      dirtyFiles,
      lastCommitDate,
      daysSinceCommit: days,
      branchCount,
      orphanBranches,
    };
  } catch (error) {
    return { name, repo, state: 'error', detail: error.message.split('\n')[0] };
  }
}

export async function GET() {
  try {
    const betRepos = parseNowBetRepos();
    const seen = new Set();
    const combined = [];
    for (const r of [...betRepos, ...STATIC_REPOS]) {
      if (seen.has(r.repo)) continue;
      seen.add(r.repo);
      combined.push(r);
    }
    const repos = combined.map(checkRepo);
    return Response.json({ repos }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message, repos: [] }, { status: 500, headers: noStoreHeaders });
  }
}
