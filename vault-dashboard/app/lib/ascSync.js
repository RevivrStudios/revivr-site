import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ASC_BIN, RENEWALS_FILE } from '@/app/lib/config';
import { APPS_DIR, listAppFolders, parseAppProfile, updateFrontmatterFields } from '@/app/api/marketing/_shared';
import { safeReadFile } from '@/app/lib/vaultFs';
import { logAction } from '@/app/lib/actionlog';

const execFileAsync = promisify(execFile);

// Normalize a name for matching: lowercase, strip everything non-alphanumeric.
// "Vision Markup" / "VisionMarkup" / "SpatialTree" / "Spatial Tree" all collapse.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Read the live app list from App Store Connect (read-only) and write each
// app's numeric App Store ID into the matching marketing-vault app-profile.md
// frontmatter (app_store_id). Confident, normalized-name matches only —
// ambiguous or unmatched apps are reported, never guessed. Powers the Phase 2a
// reviews panel without hand-entering IDs.
export async function syncAppStoreIds() {
  let apps;
  try {
    const { stdout } = await execFileAsync(ASC_BIN, ['apps', 'list', '--output', 'json'], {
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : (parsed.data || parsed.apps || []);
    apps = list
      .map((a) => {
        const at = a.attributes || a;
        return { id: String(a.id || at.id || '').replace(/\D/g, ''), name: at.name, bundleId: at.bundleId };
      })
      .filter((a) => a.id && a.name);
  } catch (err) {
    return { ok: false, error: `asc apps list failed: ${err.message}` };
  }

  // Index vault profiles by normalized folder name AND title.
  const folders = listAppFolders();
  const index = {};
  for (const folder of folders) {
    const file = path.join(APPS_DIR, folder, 'app-profile.md');
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const profile = parseAppProfile(folder, content, fs.statSync(file));
    const entry = { folder, file, content, current: profile.app_store_id };
    index[norm(folder)] = entry;
    if (profile.title) index[norm(profile.title)] ??= entry;
  }

  const summary = { matched: [], written: [], unchanged: [], unmatchedAscApps: [], profilesWithoutAscApp: [] };
  const matchedFolders = new Set();

  for (const app of apps) {
    const hit = index[norm(app.name)] || (app.bundleId ? index[norm(app.bundleId.split('.').pop())] : null);
    if (!hit) { summary.unmatchedAscApps.push({ name: app.name, id: app.id }); continue; }
    matchedFolders.add(hit.folder);
    summary.matched.push({ ascName: app.name, id: app.id, folder: hit.folder });
    if (hit.current === app.id) { summary.unchanged.push(hit.folder); continue; }
    const next = updateFrontmatterFields(hit.content, { app_store_id: app.id });
    if (next !== hit.content) {
      fs.writeFileSync(hit.file, next, 'utf8');
      summary.written.push({ folder: hit.folder, id: app.id, previous: hit.current || null });
    }
  }
  for (const folder of folders) if (!matchedFolders.has(folder)) summary.profilesWithoutAscApp.push(folder);

  await logAction({
    source: 'marketing',
    action: 'asc-sync-ids',
    label: `App Store IDs: ${summary.written.length} written, ${summary.matched.length}/${apps.length} matched`,
    success: true,
  });
  return { ok: true, ...summary };
}

// ── Renewals: certs + provisioning profiles → RENEWALS.md (Task D2) ──────────

const R_BEGIN = '<!-- BEGIN:asc-renewals -->';
const R_END = '<!-- END:asc-renewals -->';
const R_HEADING = '## App Store Connect renewals (auto-generated — do not edit)';

const rcell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
const rdate = (d) => (d ? String(d).slice(0, 10) : '');

// Read certificates + provisioning profiles from ASC (read-only) and write them
// into a marker-delimited, auto-generated table in RENEWALS.md — so the Phase 2b
// renewals tile surfaces expiring/expired signing assets automatically. Only the
// region between the markers is rewritten; the human renewals table (manual
// subscriptions/domains/memberships) is never touched.
export async function syncAscRenewals() {
  const list = async (args) => {
    const { stdout } = await execFileAsync(ASC_BIN, args, { timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    const p = JSON.parse(stdout);
    return Array.isArray(p) ? p : (p.data || p.certificates || p.profiles || []);
  };

  let certs, profiles;
  try {
    certs = await list(['certificates', 'list', '--output', 'json']);
    profiles = await list(['profiles', 'list', '--output', 'json']);
  } catch (err) {
    return { ok: false, error: `asc renewals query failed: ${err.message}` };
  }

  const rows = [];
  for (const c of certs) {
    const a = c.attributes || c;
    rows.push(`| ${rcell(a.name || a.displayName)} | certificate | ${rcell(c.id)} | ${rdate(a.expirationDate)} | — | Einar | asc:${rcell(a.certificateType)} |`);
  }
  for (const p of profiles) {
    const a = p.attributes || p;
    rows.push(`| ${rcell(a.name)} | provisioning | ${rcell(p.id)} | ${rdate(a.expirationDate)} | — | Einar | asc:${rcell(a.profileState)} |`);
  }

  const table = [
    '| item | type | identifier | renews | cost | owner | notes |',
    '|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
  const region = `${R_BEGIN}\n${table}\n${R_END}`;

  const existing = await safeReadFile(RENEWALS_FILE);
  if (!existing) return { ok: false, error: 'RENEWALS.md not found' };

  const bi = existing.indexOf(R_BEGIN);
  const ei = existing.indexOf(R_END);
  let next;
  if (bi !== -1 && ei !== -1 && ei > bi) {
    next = existing.slice(0, bi) + region + existing.slice(ei + R_END.length);
  } else {
    next = `${existing.replace(/\s*$/, '')}\n\n${R_HEADING}\n\n${region}\n`;
  }

  const changed = next !== existing;
  if (changed) fs.writeFileSync(RENEWALS_FILE, next, 'utf8');
  await logAction({
    source: 'marketing',
    action: 'asc-sync-renewals',
    label: `Renewals: ${certs.length} certs, ${profiles.length} profiles`,
    success: true,
  });
  return { ok: true, certs: certs.length, profiles: profiles.length, changed };
}
