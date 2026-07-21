import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { FLEET_SESSIONS_DIR, HEARTBEAT_STALE_MINUTES } from '@/app/lib/config';
import { scanLocalSessions } from '@/app/lib/fleetLocal';

// Glass over the claude-fleet "session board": one YAML-frontmatter file per
// running AI session, written/heartbeated by session-board.sh on each machine.
// We only READ — the files are the source of truth (glass, not storage). The
// schema (machine, software, repo, branch, status, eta, doing, claim,
// heartbeat_epoch, …) is claude-fleet's; the `software` field is what lets one
// board track Claude, Codex, and Antigravity side by side.

// Minimal flat-frontmatter parser. The session board uses simple `key: value`
// lines between --- fences — no nested YAML — so a full YAML dep is overkill.
function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) fm[key] = val;
  }
  return fm;
}

const STALE_SECONDS = HEARTBEAT_STALE_MINUTES * 60;

function ageSeconds(fm, fileMtimeMs) {
  // Prefer the explicit heartbeat epoch; fall back to file mtime so a
  // hand-written or partial file still gets a sensible liveness read.
  const ep = Number(fm.heartbeat_epoch || fm.started_epoch);
  const beatMs = Number.isFinite(ep) && ep > 0 ? ep * 1000 : fileMtimeMs;
  return Math.max(0, Math.round((Date.now() - beatMs) / 1000));
}

function elapsedFrom(epoch) {
  const ep = Number(epoch);
  if (!Number.isFinite(ep) || ep <= 0) return null;
  return Math.max(0, Math.round(Date.now() / 1000 - ep));
}

// The repo basename is the "project" — /Volumes/…/Stare&Share → "Stare&Share".
function projectName(repo, slug) {
  if (repo) {
    const base = repo.split('/').filter(Boolean).pop();
    if (base) return base;
  }
  return slug;
}

export async function listSessions() {
  // Real local sessions (this machine, read straight from Claude Code's store)
  // unioned with any session-board files reported by other machines.
  const local = await scanLocalSessions().catch(() => []);

  let files = [];
  try {
    files = (await readdir(FLEET_SESSIONS_DIR)).filter((f) => f.endsWith('.md'));
  } catch {
    /* board folder may not exist yet — local sessions still show */
  }

  const sessions = [...local];
  for (const f of files) {
    const full = path.join(FLEET_SESSIONS_DIR, f);
    try {
      const [text, st] = await Promise.all([readFile(full, 'utf8'), stat(full)]);
      const fm = parseFrontmatter(text);
      if (!fm || !fm.machine) continue;
      const age = ageSeconds(fm, st.mtimeMs);
      const stale = age > STALE_SECONDS;
      const slug = fm.slug || f.replace(/\.md$/, '');
      // A stale auto-reported session reads "idle", not "active" — but keep a
      // meaningful self-reported status (blocked / needs-decision) if present.
      let status = (fm.status || 'active').toLowerCase();
      if (stale && ['active', 'building', 'running', 'compiling'].includes(status)) status = 'idle';
      sessions.push({
        file: f,
        machine: fm.machine,
        slug,
        project: projectName(fm.repo, slug),
        software: (fm.software || 'unknown').toLowerCase(),
        repo: fm.repo || '',
        branch: fm.branch || '',
        status,
        eta: fm.eta || '',
        doing: fm.doing || '',
        claim: fm.claim || '',
        commit: fm.commit || '',
        commitMsg: fm.commit_msg || '',
        commitAgeSeconds: elapsedFrom(fm.commit_epoch),
        pid: fm.pid || '',
        started: fm.started || '',
        runtimeSeconds: elapsedFrom(fm.started_epoch),
        ageSeconds: age,
        stale: age > STALE_SECONDS,
      });
    } catch {
      /* skip unreadable/partial files */
    }
  }
  return { sessions, available: true, dir: FLEET_SESSIONS_DIR, staleMinutes: HEARTBEAT_STALE_MINUTES };
}

// Group sessions by machine, newest-heartbeat first, live before stale.
export function groupByMachine(sessions) {
  const byMachine = {};
  for (const s of sessions) (byMachine[s.machine] ||= []).push(s);
  return Object.entries(byMachine)
    .map(([machine, list]) => {
      list.sort((a, b) => a.ageSeconds - b.ageSeconds);
      const live = list.filter((s) => !s.stale);
      return {
        machine,
        sessions: list,
        liveCount: live.length,
        staleCount: list.length - live.length,
        software: [...new Set(list.map((s) => s.software))],
        freshestAge: list.length ? Math.min(...list.map((s) => s.ageSeconds)) : null,
      };
    })
    .sort((a, b) => b.liveCount - a.liveCount || a.machine.localeCompare(b.machine));
}
