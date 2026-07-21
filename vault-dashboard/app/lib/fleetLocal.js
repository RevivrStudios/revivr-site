import { readdir, stat, open } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { CLAUDE_PROJECTS_DIR, CODEX_SESSIONS_DIR, FLEET_MACHINE_NAME, FLEET_ACTIVE_WINDOW_MIN, HEARTBEAT_STALE_MINUTES } from '@/app/lib/config';

const execFileAsync = promisify(execFile);

// Real session detection for the LOCAL machine (the dashboard host). Claude Code
// stores every session on disk at ~/.claude/projects/<encoded-cwd>/<id>.jsonl —
// so the dashboard can read the machine's own live sessions directly, no emitter
// or sync needed. This is the source of the actual "what's running here" data;
// other machines report via the synced session board (app/lib/fleet.js).

// Friendly name for THIS machine — ComputerName ("Mac Studio"), overridable.
let _machineName;
async function machineName() {
  if (_machineName) return _machineName;
  if (FLEET_MACHINE_NAME) return (_machineName = FLEET_MACHINE_NAME);
  try {
    const { stdout } = await execFileAsync('scutil', ['--get', 'ComputerName'], { timeout: 4000 });
    _machineName = stdout.trim() || os.hostname();
  } catch {
    _machineName = os.hostname();
  }
  return _machineName;
}

// Read just the head of a (possibly large) jsonl and pull cwd + gitBranch from
// the first line that carries them — bounded so we never load a huge transcript.
async function readSessionMeta(file) {
  let fh;
  try {
    fh = await open(file, 'r');
    const buf = Buffer.alloc(65536);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const text = buf.toString('utf8', 0, bytesRead);
    let cwd = '', branch = '', firstTs = null;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      if (firstTs == null && obj.timestamp) firstTs = Date.parse(obj.timestamp) || null;
      if (!cwd && obj.cwd) cwd = obj.cwd;
      if (!branch && obj.gitBranch && obj.gitBranch !== 'HEAD') branch = obj.gitBranch;
      if (cwd && branch) break;
    }
    return { cwd, branch, firstTs };
  } catch {
    return { cwd: '', branch: '', firstTs: null };
  } finally {
    await fh?.close();
  }
}

async function lastCommit(repo) {
  if (!repo) return null;
  try {
    const { stdout } = await execFileAsync('git', ['-C', repo, 'log', '-1', '--format=%h%x1f%s%x1f%ct'], { timeout: 4000 });
    const [sha, msg, ct] = stdout.trim().split('\x1f');
    if (!sha) return null;
    let branch = '';
    try {
      const r = await execFileAsync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 4000 });
      branch = r.stdout.trim();
      if (branch === 'HEAD') branch = '';
    } catch { /* leave blank */ }
    return { sha, msg, branch, ageSeconds: Math.max(0, Math.round(Date.now() / 1000 - Number(ct))) };
  } catch {
    return null; // not a git repo, or git unavailable — degrade quietly
  }
}

// Decode an encoded project folder to a readable project name as a fallback
// (the precise cwd from the jsonl is preferred). Trailing segment of the path.
function fallbackProject(folder) {
  const seg = folder.replace(/^-/, '').split('-');
  return seg[seg.length - 1] || folder;
}

const STALE_SECONDS = HEARTBEAT_STALE_MINUTES * 60;

// Scan the local Claude Code project store. Returns sessions active within the
// window (default 6h) so the board shows what's running/ran-today, not every
// historical conversation.
export async function scanLocalClaudeSessions() {
  let dirs;
  try {
    dirs = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const machine = await machineName();
  const windowSeconds = FLEET_ACTIVE_WINDOW_MIN * 60;
  const now = Date.now();
  const out = [];

  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(CLAUDE_PROJECTS_DIR, d.name);
    let latest = null;
    let latestMtime = 0;
    try {
      for (const f of await readdir(dir)) {
        if (!f.endsWith('.jsonl')) continue;
        const st = await stat(path.join(dir, f));
        if (st.mtimeMs > latestMtime) { latestMtime = st.mtimeMs; latest = { file: path.join(dir, f), id: f.replace(/\.jsonl$/, '') }; }
      }
    } catch { continue; }
    if (!latest) continue;

    const ageSeconds = Math.max(0, Math.round((now - latestMtime) / 1000));
    if (ageSeconds > windowSeconds) continue; // outside the active window

    const meta = await readSessionMeta(latest.file);
    const repo = meta.cwd || '';
    const project = repo ? repo.split('/').filter(Boolean).pop() : fallbackProject(d.name);
    const commit = await lastCommit(repo);
    const stale = ageSeconds > STALE_SECONDS;

    out.push({
      file: `local:${latest.id}`,
      machine,
      slug: latest.id.slice(0, 8),
      project,
      software: 'claude',
      repo,
      branch: meta.branch || commit?.branch || '',
      status: stale ? 'idle' : 'active',
      eta: '',
      doing: '',
      claim: '',
      commit: commit?.sha || '',
      commitMsg: commit?.msg || '',
      commitAgeSeconds: commit?.ageSeconds ?? null,
      pid: '',
      started: meta.firstTs ? new Date(meta.firstTs).toISOString() : '',
      runtimeSeconds: meta.firstTs ? Math.max(0, Math.round((now - meta.firstTs) / 1000)) : null,
      ageSeconds,
      stale,
      source: 'local-claude',
    });
  }
  return out;
}

// Recursively collect files under a bounded-depth tree (Codex nests its
// sessions as sessions/YYYY/MM/DD/rollout-*.jsonl).
async function walkFiles(dir, depth, match) {
  const found = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return found; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0) found.push(...await walkFiles(full, depth - 1, match));
    else if (e.isFile() && match(e.name)) found.push(full);
  }
  return found;
}

// Codex stores each session's cwd + git in the first `session_meta` line's
// payload — so we get project, branch, and commit straight from the file.
export async function scanLocalCodexSessions() {
  const files = await walkFiles(CODEX_SESSIONS_DIR, 3, (n) => n.startsWith('rollout-') && n.endsWith('.jsonl'));
  const machine = await machineName();
  const windowSeconds = FLEET_ACTIVE_WINDOW_MIN * 60;
  const now = Date.now();
  const out = [];

  for (const file of files) {
    let st;
    try { st = await stat(file); } catch { continue; }
    const ageSeconds = Math.max(0, Math.round((now - st.mtimeMs) / 1000));
    if (ageSeconds > windowSeconds) continue;

    // The session_meta line embeds the full system prompt, so it can exceed any
    // sane buffer — regex the early fields (cwd, timestamp) from the head chunk
    // instead of JSON.parsing the whole (truncated) line.
    let fh, cwd = '', firstTs = null, sid = path.basename(file).replace(/^rollout-[0-9T-]*-/, '').replace(/\.jsonl$/, '');
    try {
      fh = await open(file, 'r');
      const buf = Buffer.alloc(32768);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      const head = buf.toString('utf8', 0, bytesRead);
      const line = head.split('\n')[0] || head;
      cwd = line.match(/"cwd":"([^"]*)"/)?.[1] || '';
      const ts = line.match(/"timestamp":"([^"]*)"/)?.[1];
      firstTs = ts ? (Date.parse(ts) || null) : null;
      sid = line.match(/"session_id":"([^"]*)"/)?.[1] || sid;
    } catch { /* skip malformed */ } finally { await fh?.close(); }

    if (!cwd) continue;
    const commit = await lastCommit(cwd);
    const branch = commit?.branch || '';
    const stale = ageSeconds > STALE_SECONDS;
    out.push({
      file: `local-codex:${sid}`,
      machine,
      slug: String(sid).slice(0, 8),
      project: cwd.split('/').filter(Boolean).pop(),
      software: 'codex',
      repo: cwd,
      branch,
      status: stale ? 'idle' : 'active',
      eta: '', doing: '', claim: '',
      commit: commit?.sha || '',
      commitMsg: commit?.msg || '',
      commitAgeSeconds: commit?.ageSeconds ?? null,
      pid: '',
      started: firstTs ? new Date(firstTs).toISOString() : '',
      runtimeSeconds: firstTs ? Math.max(0, Math.round((now - firstTs) / 1000)) : null,
      ageSeconds,
      stale,
      source: 'local-codex',
    });
  }
  return out;
}

// Everything the dashboard host can detect about its own sessions.
export async function scanLocalSessions() {
  const [claude, codex] = await Promise.all([
    scanLocalClaudeSessions().catch(() => []),
    scanLocalCodexSessions().catch(() => []),
  ]);
  return [...claude, ...codex];
}
