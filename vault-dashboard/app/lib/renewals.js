import { readFile } from 'fs/promises';
import { RENEWALS_FILE } from '@/app/lib/config';

// Plain-language "what is this?" per renewal type, so a home-page row like
// "AVPSetup · provisioning · expired 635d ago" can be understood without
// leaving the dashboard. Derived from `type`; a row may override it with its
// own free-text `whatisthis` (or `note`) column and that wins verbatim. The
// ASC-synced `notes` column (asc:ACTIVE etc.) is a machine tag, not this.
const TYPE_WHAT = {
  provisioning:
    'Apple provisioning profile — ties an app ID, your signing certificate, and a set of test devices together so a build can be signed for dev/ad-hoc testing. Once expired, new development/ad-hoc builds of that app won’t install until the profile is regenerated (Xcode’s Signing & Capabilities, the Apple Developer portal, or the asc CLI).',
  certificate:
    'Apple signing certificate — the cryptographic identity that proves a build came from you. When it expires, anything signed with it can no longer be notarized or installed, and you regenerate it in the Apple Developer portal / Xcode before shipping again.',
  membership:
    'Apple Developer Program membership — the paid account (≈$99/yr) that enables TestFlight and App Store distribution. If it lapses, your apps are pulled from sale and App Store Connect access is lost until it’s renewed.',
  domain:
    'A registered domain name. If it expires the site and any email on it stop resolving, and after a short grace period the name can be registered by someone else.',
  subscription:
    'A recurring paid service or tool. If it lapses you lose access to it until it’s renewed.',
};

export function renewalWhatIsThis(row) {
  const override = (row.whatisthis || row.note || '').trim();
  if (override) return override;
  return TYPE_WHAT[(row.type || '').toLowerCase()] || null;
}

// Days-until logic lifted from the retired Resources feature (2026-07-13):
// expired if past, "expiring" within the horizon, plus the raw day count.
export function expiryInfo(dateStr, horizonDays = 45) {
  if (!dateStr) return { expiring: false, expired: false, daysLeft: null };
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return { expiring: false, expired: false, daysLeft: null };
  const days = Math.ceil((t - Date.now()) / 86400000);
  return { expired: days < 0, expiring: days >= 0 && days <= horizonDays, daysLeft: days };
}

// Parse the first markdown table in RENEWALS.md into renewal rows. Skips
// fenced code blocks and HTML comments so example rows kept in the file for
// reference are never mistaken for real data.
export async function listRenewals() {
  let text;
  try {
    text = await readFile(RENEWALS_FILE, 'utf-8');
  } catch {
    return []; // file absent or unreadable — nothing to surface
  }
  const rows = [];
  let headers = null;
  let inFence = false;
  let inComment = false;
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (t.startsWith('```')) { inFence = !inFence; continue; }
    if (inComment) { if (t.includes('-->')) inComment = false; continue; }
    if (t.includes('<!--')) { if (!t.includes('-->')) inComment = true; continue; }
    // A heading starts a new section — re-detect the header for the next table,
    // so a manual table and an auto-generated one (each under its own heading)
    // both parse with their own columns.
    if (t.startsWith('#')) { headers = null; continue; }
    if (inFence || !t.startsWith('|')) continue;

    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => c === '' || /^:?-+:?$/.test(c))) continue; // separator row
    if (!headers) { headers = cells.map((c) => c.toLowerCase()); continue; }

    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    if (!row.item) continue;
    rows.push({ ...row, ...expiryInfo(row.renews || row.expires), whatIsThis: renewalWhatIsThis(row) });
  }
  return rows;
}
