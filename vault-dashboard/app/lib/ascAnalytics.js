import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { ASC_BIN, ASC_VENDOR, ASC_VITALS_CACHE } from '@/app/lib/config';

const execFileAsync = promisify(execFile);

// Business Vitals data layer over the `asc` CLI (App Store Connect).
//
// Two sources, both degrade gracefully:
//   • Sales & Trends (`insights weekly --source sales`) — real units + proceeds,
//     needs a vendor number (ASC_VENDOR_NUMBER). This is the headline number.
//   • Analytics Reports API (`analytics request/requests`) — the richer funnel
//     (impressions → downloads → conversion), needs no vendor but must be
//     provisioned once (ONGOING request), after which Apple generates data over
//     ~24–48h.
//
// Nothing here throws to the route on missing setup — it returns a typed status
// ('setup' | 'provisioning' | 'ready') so the UI can guide the next step.

async function runAsc(args, { timeoutMs = 25000 } = {}) {
  const { stdout } = await execFileAsync(ASC_BIN, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function runAscJson(args, opts) {
  const out = await runAsc(args, opts);
  const start = out.indexOf('{');
  const arrStart = out.indexOf('[');
  const from = start === -1 ? arrStart : (arrStart === -1 ? start : Math.min(start, arrStart));
  if (from === -1) throw new Error('asc returned no JSON');
  return JSON.parse(out.slice(from));
}

// ── Apps ────────────────────────────────────────────────────────────────
let _appsCache;
export async function getApps() {
  if (_appsCache) return _appsCache;
  const json = await runAscJson(['apps', 'list']);
  const apps = (json.data || []).map((a) => ({
    id: a.id,
    name: a.attributes?.name || a.attributes?.bundleId || a.id,
    bundleId: a.attributes?.bundleId || '',
  }));
  _appsCache = apps;
  return apps;
}

// Monday (UTC) of the most recent COMPLETE week — sales/analytics for the
// current week isn't final, so we report the last closed week.
export function lastCompleteWeekStart(now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun
  const sinceMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - sinceMonday - 7); // step back into last week
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Pull a metric value out of the insights `metrics[]` array by fuzzy name match,
// only when the CLI marked it available.
function pickMetric(metrics, ...names) {
  for (const m of metrics || []) {
    if (m.status && m.status !== 'available') continue;
    const n = (m.name || '').toLowerCase();
    if (names.some((want) => n.includes(want)) && (m.value ?? m.current) != null) {
      return Number(m.value ?? m.current);
    }
  }
  return null;
}

// ── Sales & Trends (headline units + proceeds) ──────────────────────────
async function salesInsights(appId, vendor, week) {
  try {
    const json = await runAscJson(
      ['insights', 'weekly', '--app', appId, '--source', 'sales', '--vendor', vendor, '--week', week],
      { timeoutMs: 30000 }
    );
    const metrics = json.metrics || [];
    const units = pickMetric(metrics, 'units', 'downloads', 'installs');
    const proceeds = pickMetric(metrics, 'proceeds', 'revenue', 'earnings');
    const prevUnits = (json.previous && pickMetric(json.previous.metrics, 'units', 'downloads')) ?? null;
    const available = units != null || proceeds != null;
    return {
      available,
      units,
      proceeds,
      wowUnits: units != null && prevUnits != null ? units - prevUnits : null,
      reason: available ? null : (metrics.find((m) => m.reason)?.reason || 'no sales data for this week'),
    };
  } catch (err) {
    return { available: false, units: null, proceeds: null, wowUnits: null, reason: err.message };
  }
}

// ── Analytics Reports API provisioning status ───────────────────────────
export async function analyticsProvisioned(appId) {
  try {
    const json = await runAscJson(['analytics', 'requests', '--app', appId]);
    return (json.data || []).length > 0;
  } catch {
    return false;
  }
}

export async function provisionAnalytics(appId) {
  // Idempotent-ish: creating a second ONGOING request is harmless, but skip if
  // one already exists to avoid clutter.
  if (await analyticsProvisioned(appId)) return { appId, provisioned: true, created: false };
  await runAsc(['analytics', 'request', '--app', appId, '--access-type', 'ONGOING'], { timeoutMs: 30000 });
  return { appId, provisioned: true, created: true };
}

// ── Aggregate ───────────────────────────────────────────────────────────
export async function computeVitals() {
  const week = lastCompleteWeekStart();
  const vendorConfigured = Boolean(ASC_VENDOR);
  let apps;
  try {
    apps = await getApps();
  } catch (err) {
    return { generatedAt: new Date().toISOString(), overall: 'error', error: err.message, week, apps: [] };
  }

  const rows = [];
  let anyReady = false;
  let anyProvisioned = false;

  for (const app of apps) {
    const provisioned = await analyticsProvisioned(app.id).catch(() => false);
    if (provisioned) anyProvisioned = true;
    let sales = { available: false, units: null, proceeds: null, wowUnits: null, reason: 'vendor number not set' };
    if (vendorConfigured) {
      sales = await salesInsights(app.id, ASC_VENDOR, week);
      if (sales.available) anyReady = true;
    }
    rows.push({ ...app, provisioned, ...sales });
  }

  const overall = anyReady ? 'ready' : (vendorConfigured || anyProvisioned ? 'provisioning' : 'setup');
  return {
    generatedAt: new Date().toISOString(),
    week,
    vendorConfigured,
    overall,
    apps: rows,
    totals: {
      units: rows.reduce((s, r) => s + (r.units || 0), 0),
      proceeds: rows.reduce((s, r) => s + (r.proceeds || 0), 0),
    },
  };
}

// ── Cache (glass over asc; a redeploy-safe runtime cache, gitignored) ────
export async function readVitalsCache() {
  try {
    return JSON.parse(await fs.readFile(ASC_VITALS_CACHE, 'utf8'));
  } catch {
    return null;
  }
}

export async function writeVitalsCache(data) {
  await fs.mkdir(path.dirname(ASC_VITALS_CACHE), { recursive: true });
  await fs.writeFile(ASC_VITALS_CACHE, JSON.stringify(data, null, 2), 'utf8');
}
