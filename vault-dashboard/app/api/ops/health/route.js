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

// This route verifies OUTPUT ARTIFACTS (files, commits, exit codes), not
// whether a process is technically running — that is the entire point of
// Phase 3 of Revivr_Operations_Site_Build_Plan_for_Sonnet5.md. It reads
// health-manifest.json fresh on every request; nothing here writes new
// state files (Prime Directive: glass, not storage).
const MANIFEST_PATH = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Obsidian',
  'OpenClaw_Agent',
  'Infrastructure',
  'health-manifest.json'
);

const REVIVR_PREFIXES = ['com.revivr.', 'ai.openclaw.', 'com.revivrstudios.', 'com.openclaw.'];

function expandPath(raw) {
  let resolved = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : raw;
  resolved = resolved.replace('{TODAY}', new Date().toISOString().split('T')[0]);
  return resolved;
}

function ageHours(mtimeMs) {
  return (Date.now() - mtimeMs) / (1000 * 60 * 60);
}

function formatHours(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours)}h`;
}

// Rule 0 (no dead-end signals): every check must carry a `fix` — a link to
// where the fix happens on the site, or a remediation descriptor (what's
// watched, why it's red, and the exact next step). A check with neither
// doesn't ship. See health-manifest.json's per-check `fix` field.
const NO_FIX_FALLBACK = { type: 'remediation', watches: null, cause: 'No fix metadata configured for this check yet.', steps: 'Investigate manually — this check is missing its `fix` entry in health-manifest.json.' };

function checkArtifact(check) {
  const target = expandPath(check.artifact);
  const fix = check.fix || NO_FIX_FALLBACK;
  if (!fs.existsSync(target)) {
    return { name: check.name, state: 'missing', detail: `${target} does not exist`, age_hours: null, fix };
  }
  const stat = fs.statSync(target);
  const hours = ageHours(stat.mtimeMs);
  const state = hours > check.max_age_hours ? 'stale' : 'ok';
  return {
    name: check.name,
    state,
    detail: state === 'stale'
      ? `Last written ${formatHours(hours)} ago (limit ${check.max_age_hours}h)`
      : `Last written ${formatHours(hours)} ago`,
    age_hours: Math.round(hours * 10) / 10,
    fix,
  };
}

function checkGitRepo(check) {
  const repoPath = expandPath(check.git_repo);
  const fix = check.fix || NO_FIX_FALLBACK;
  if (!fs.existsSync(repoPath)) {
    return { name: check.name, state: 'missing', detail: `${repoPath} does not exist`, age_hours: null, fix };
  }
  try {
    const out = execSync(`git -C ${JSON.stringify(repoPath)} log -1 --format=%ct`, { encoding: 'utf8' }).trim();
    const commitMs = Number(out) * 1000;
    const hours = ageHours(commitMs);
    const state = hours > check.max_commit_age_hours ? 'stale' : 'ok';
    return {
      name: check.name,
      state,
      detail: state === 'stale'
        ? `Last commit ${formatHours(hours)} ago (limit ${check.max_commit_age_hours}h)`
        : `Last commit ${formatHours(hours)} ago`,
      age_hours: Math.round(hours * 10) / 10,
      fix,
    };
  } catch (error) {
    return { name: check.name, state: 'error', detail: error.message, age_hours: null, fix };
  }
}

function checkLaunchAgentSweep(sweepConfig) {
  try {
    const out = execSync('launchctl list', { encoding: 'utf8' });
    const ignorePatterns = (sweepConfig.ignore || []).map(
      (pattern) => new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`)
    );
    const failing = [];
    out.split('\n').forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return;
      const [, status, label] = parts;
      if (!REVIVR_PREFIXES.some((prefix) => label.startsWith(prefix))) return;
      if (ignorePatterns.some((re) => re.test(label))) return;
      const exitCode = Number(status);
      if (!Number.isNaN(exitCode) && exitCode !== 0) {
        failing.push({ label, exitCode, command: `launchctl kickstart -k gui/501/${label}` });
      }
    });
    return {
      name: 'LaunchAgent exit sweep',
      state: failing.length > 0 ? 'error' : 'ok',
      detail: failing.length > 0
        ? failing.map((f) => `${f.label} (exit ${f.exitCode})`).join(', ')
        : 'All Revivr/OpenClaw agents last-exit 0',
      age_hours: null,
      fix: failing.length > 0
        ? {
            type: 'remediation',
            watches: 'launchctl list output for every com.revivr./ai.openclaw. agent',
            cause: `${failing.length} agent(s) exited non-zero on their last run.`,
            items: failing,
          }
        : NO_FIX_FALLBACK,
    };
  } catch (error) {
    return { name: 'LaunchAgent exit sweep', state: 'error', detail: error.message, age_hours: null, fix: NO_FIX_FALLBACK };
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return Response.json(
        { checks: [], error: 'health-manifest.json not found — nothing to check yet' },
        { headers: noStoreHeaders }
      );
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const checks = (manifest.checks || []).map((check) => (check.git_repo ? checkGitRepo(check) : checkArtifact(check)));
    if (manifest.launchagent_sweep) {
      checks.push(checkLaunchAgentSweep(manifest.launchagent_sweep));
    }
    return Response.json({ checks }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message, checks: [] }, { status: 500, headers: noStoreHeaders });
  }
}
