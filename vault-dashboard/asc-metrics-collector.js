#!/usr/bin/env node
// asc-metrics-collector — daily App Store Connect metrics cache.
//
// For every marketing app with an app_store_id, pulls last complete week's
// sales insights (units/downloads/proceeds via the vendor's Sales & Trends)
// and analytics insights (installs/sessions once Apple's ONGOING report
// requests start generating — created 2026-07-21) through the local `asc`
// CLI, and writes a single JSON cache that /api/marketing/metrics serves.
//
// Runs daily at 06:30 via launchd (com.revivr.asc-metrics-collector), before
// quell-ops-digest (07:45) so Quell's morning digest carries fresh numbers.
// Reads the dashboard's own .env.local for the API token (single source of
// truth); asc auth comes from ~/.asc profile — no credentials here.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ASC = '/opt/homebrew/bin/asc';
const BASE = process.env.DASHBOARD_URL || 'http://localhost:3000';
const VENDOR = process.env.ASC_VENDOR_NUMBER || '93997191';
const OUT_DIR = path.join(__dirname, 'data', 'marketing', 'metrics');
const OUT_FILE = path.join(OUT_DIR, 'summary.json');

function readToken() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('DASHBOARD_TOKEN='));
    return line ? line.slice('DASHBOARD_TOKEN='.length).trim() : '';
  } catch {
    return '';
  }
}

// Monday of the last COMPLETE week (stable numbers; ASC data lags ~1-2 days).
function lastCompleteWeekMonday(now = new Date()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day - 7);
  return d.toISOString().slice(0, 10);
}

function ascInsights(appId, source, week) {
  const args = ['insights', 'weekly', '--app', appId, '--source', source, '--week', week, '--output', 'json'];
  if (source === 'sales') args.push('--vendor', VENDOR);
  try {
    const raw = execFileSync(ASC, args, { timeout: 120000, encoding: 'utf8' });
    return JSON.parse(raw);
  } catch (err) {
    return { error: String(err.message || err).slice(0, 300) };
  }
}

// Flatten the insights metrics array into {name: {value, previous, status}}.
function flattenMetrics(insights) {
  const out = {};
  for (const m of insights.metrics || []) {
    out[m.name] = m.status === 'unavailable'
      ? { status: 'unavailable', reason: (m.reason || '').slice(0, 160) }
      : { status: 'ok', value: m.value ?? m.thisWeek ?? null, previous: m.previousValue ?? m.lastWeek ?? null, unit: m.unit };
  }
  return out;
}

async function main() {
  const token = readToken();
  if (!token) {
    console.error('no DASHBOARD_TOKEN in .env.local next to this script; aborting');
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/marketing/apps`, { headers: { Authorization: `Bearer ${token}` } });
  const apps = ((await res.json()).apps || []).filter((a) => a.app_store_id);
  const week = lastCompleteWeekMonday();

  const results = [];
  for (const app of apps) {
    const sales = ascInsights(app.app_store_id, 'sales', week);
    const analytics = ascInsights(app.app_store_id, 'analytics', week);
    results.push({
      slug: app.slug,
      title: app.title,
      appStoreId: app.app_store_id,
      status: app.status,
      week: sales.week || { start: week },
      sales: sales.error ? { error: sales.error } : flattenMetrics(sales),
      analytics: analytics.error ? { error: analytics.error } : flattenMetrics(analytics),
    });
    console.log(`collected ${app.slug} (${app.app_store_id})`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    vendorNumber: VENDOR,
    weekStart: week,
    source: 'asc insights weekly (sales + analytics)',
    note: 'analytics reports begin generating ~24-48h after the 2026-07-21 ONGOING requests; sales reflects Sales & Trends with ~1-2 day lag',
    apps: results,
  }, null, 1));
  console.log(`wrote ${OUT_FILE} (${results.length} apps, week of ${week})`);
}

main().catch((err) => { console.error(err); process.exit(1); });
