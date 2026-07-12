import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { APPS_CONFIG_FILE, CAMPAIGNS_DIR, APP_STORE_COUNTRY } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';

// Quell's data layer: the app portfolio, App Store review monitoring (via
// Apple's public per-app review feeds — no App Store Connect credentials
// needed), and a lightweight campaign board.

// ── App portfolio ───────────────────────────────────────────────

export async function listApps() {
  try {
    return JSON.parse(await readFile(APPS_CONFIG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function saveApps(apps) {
  await ensureDir(path.dirname(APPS_CONFIG_FILE));
  await writeFile(APPS_CONFIG_FILE, JSON.stringify(apps, null, 2), 'utf-8');
}

export async function upsertApp(app) {
  const apps = await listApps();
  const id = app.id || crypto.randomUUID();
  const idx = apps.findIndex((a) => a.id === id);
  const record = {
    id,
    name: app.name || 'Untitled app',
    appStoreId: (app.appStoreId || '').replace(/\D/g, ''), // numeric Apple ID only
    bundleId: app.bundleId || '',
    status: ['live', 'beta', 'development', 'retired'].includes(app.status) ? app.status : 'development',
    launchDate: app.launchDate || '',
    url: app.url || '',
    notes: app.notes || '',
  };
  if (idx === -1) apps.push(record);
  else apps[idx] = record;
  await saveApps(apps);
  return record;
}

export async function deleteApp(id) {
  const apps = await listApps();
  const next = apps.filter((a) => a.id !== id);
  await saveApps(next);
  return next.length !== apps.length;
}

// ── App Store reviews (public RSS, no auth) ─────────────────────

export async function fetchReviews(appStoreId, country = APP_STORE_COUNTRY) {
  const id = String(appStoreId).replace(/\D/g, '');
  if (!id) throw new Error('App needs a numeric App Store ID to fetch reviews.');
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`App Store feed returned HTTP ${res.status}`);
  const doc = await res.json();
  const entries = Array.isArray(doc?.feed?.entry) ? doc.feed.entry : [];
  // First entry is app metadata when present; review entries carry im:rating.
  return entries
    .filter((e) => e['im:rating'])
    .map((e) => ({
      title: e.title?.label || '',
      rating: parseInt(e['im:rating']?.label || '0', 10),
      author: e.author?.name?.label || '',
      version: e['im:version']?.label || '',
      content: (e.content?.label || '').slice(0, 800),
      updated: e.updated?.label || '',
    }));
}

// ── Campaigns (markdown + frontmatter, vault-compatible) ────────

const CAMPAIGN_STATUSES = ['idea', 'planned', 'in-progress', 'shipped', 'dropped'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fields: {}, body: content };
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fields, body: content.slice(match[0].length) };
}

export async function listCampaigns() {
  await ensureDir(CAMPAIGNS_DIR);
  const files = (await readdir(CAMPAIGNS_DIR)).filter((f) => f.endsWith('.md'));
  const campaigns = [];
  for (const f of files) {
    try {
      const raw = await readFile(path.join(CAMPAIGNS_DIR, f), 'utf-8');
      const { fields, body } = parseFrontmatter(raw);
      campaigns.push({ filename: f, ...fields, body });
    } catch { /* skip unreadable */ }
  }
  return campaigns.sort((a, b) => ((a.target_date || '9999') < (b.target_date || '9999') ? -1 : 1));
}

export async function createCampaign({ title, app, channel, status, target_date, body }) {
  await ensureDir(CAMPAIGNS_DIR);
  const id = `CAMP-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString().slice(0, 10);
  const content = `---
id: ${id}
title: ${title}
app: ${app || ''}
channel: ${channel || ''}
status: ${CAMPAIGN_STATUSES.includes(status) ? status : 'idea'}
target_date: ${target_date || ''}
created: ${now}
updated: ${now}
---
${body || ''}
`;
  await writeFile(path.join(CAMPAIGNS_DIR, `${id}.md`), content, 'utf-8');
  return { id, filename: `${id}.md`, title, app, channel, status: status || 'idea', target_date, created: now, updated: now, body: body || '' };
}

export async function updateCampaign(id, updates) {
  const campaigns = await listCampaigns();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return null;
  const filePath = path.join(CAMPAIGNS_DIR, path.basename(campaign.filename));
  const raw = await readFile(filePath, 'utf-8');
  const { fields, body } = parseFrontmatter(raw);

  for (const key of ['title', 'app', 'channel', 'target_date']) {
    if (updates[key] != null) fields[key] = updates[key];
  }
  if (updates.status && CAMPAIGN_STATUSES.includes(updates.status)) fields.status = updates.status;
  fields.updated = new Date().toISOString().slice(0, 10);

  const newBody = updates.appendNote
    ? `${body.trimEnd()}\n\n## Note (${fields.updated})\n${updates.appendNote}\n`
    : body;
  const fm = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
  await writeFile(filePath, `---\n${fm}\n---\n${newBody}`, 'utf-8');
  return { ...fields, body: newBody, filename: campaign.filename };
}
