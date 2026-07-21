import fs from 'fs';
import path from 'path';
import os from 'os';
import { listRadSlugs, radFilePath, parseRadProject } from '../rad/_shared';

// Canonical marketing vault paths. Read-live, write-through — never a local copy.
export const MARKETING_VAULT_ROOT = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Obsidian',
  'Revivr Marketing'
);
export const APPROVALS_DIR = path.join(MARKETING_VAULT_ROOT, '12 Approvals');
export const ASSETS_DIR = path.join(MARKETING_VAULT_ROOT, '07 Assets');
export const APPS_DIR = path.join(MARKETING_VAULT_ROOT, '01 Apps');
export const MARKETING_MEMORY_PATH = path.join(MARKETING_VAULT_ROOT, '09 Meta', 'Quell Marketing Memory.md');
export const PUBLISH_LOG_PATH = path.join(MARKETING_VAULT_ROOT, '09 Meta', 'PUBLISH_LOG.md');
// Social pipeline vault schema (M1, 2026-07-09) — see Quinn_Social_Pipeline_Build_Plan_for_Sonnet5.md Phase 1.
export const DROPS_DIR = path.join(MARKETING_VAULT_ROOT, '15 Drops');
export const DROPS_INTAKE_DIR = path.join(DROPS_DIR, '_Intake');
export const SOCIAL_QUEUE_DIR = path.join(MARKETING_VAULT_ROOT, '16 Social Queue');
// Drop media storage (M2, 2026-07-09) — confirmed with Einar: local to
// MacRevivr-Studio, off iCloud (WIP videos are large), inside the deployed
// runtime's own dir so it never needs a separate backup path. IMPORTANT: this
// lives inside TARGET_DIR in deploy-dashboard.sh, which rsyncs with
// `--delete` — `media` MUST stay in that script's exclude list or a redeploy
// wipes every drop's media. Markdown truth stays in the vault; only binaries
// live here.
export const MEDIA_ROOT = path.join(os.homedir(), 'Library', 'Application Support', 'Revivr', 'VaultDashboard', 'media');
export const DROPS_MEDIA_DIR = path.join(MEDIA_ROOT, 'drops');
export const SOCIAL_TARGETS_PATH = path.join(MARKETING_VAULT_ROOT, '09 Meta', 'Social Targets.md');
// Voice corpora + golden set (M6, Phase 7, 2026-07-09).
export const VOICE_DIR = path.join(MARKETING_VAULT_ROOT, '17 Voice');
export const GOLDEN_SET_PATH = path.join(VOICE_DIR, 'Revivr Golden Set.md');
export const GOLDEN_SET_MINIMUM = 5;

export function countGoldenSetEntries() {
  if (!fs.existsSync(GOLDEN_SET_PATH)) return 0;
  const content = fs.readFileSync(GOLDEN_SET_PATH, 'utf8');
  return (content.match(/^##\s+Entry\b/gm) || []).length;
}
// MARKETING_BRIDGE_PATH removed 2026-07-08 (RAD integration Phase 3) — the
// bridge JSON it pointed to is archived at RAD/_migration/, and RAD truth is
// now read live via readRadPortfolio()/findLiveRadData() below.

export const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const IMAGE_EXT_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function imageMimeForExt(ext) {
  return IMAGE_EXT_MIME[ext.toLowerCase()] || null;
}

/**
 * Real schema verified against 47 live records in `12 Approvals/` (2026-07-11):
 * ---
 * approval_id: approval_20260511140531
 * app_id: track-stash
 * item_type: copy | visual | ad-concept | visual-asset
 * status: needs-einar-review | rejected   (approved / needs-changes / superseded added by this route)
 * channel: X/Twitter
 * created: 2026-05-11
 * approved_at:
 * related: [...]  (wikilinks — not parsed, not needed for the UI)
 * ---
 * # <Title>
 * ## Approval Request
 * ## Draft            <- either a single absolute image path, or free-form copy
 *                         (copy records may contain nested ## sub-headings here —
 *                         everything up to ## Risk Check belongs to Draft)
 * ## Risk Check
 * ## Decision
 * **Status:** ...
 * **Decision notes:** ...
 */
export function parseApprovalFrontmatter(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const fm = {};
  if (fmMatch) {
    fmMatch[1].split('\n').forEach((line) => {
      if (/^\s/.test(line)) return; // skip indented list items (e.g. related: - "...")
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key) fm[key] = value;
    });
  }
  return fm;
}

export function extractDraftSection(content) {
  const draftMatch = content.match(/##\s*Draft\s*\n([\s\S]*?)(?=\n##\s*Risk Check\b|\n##\s*Decision\b|$)/);
  return draftMatch ? draftMatch[1].trim() : '';
}

// Draft-section image references come in four real shapes (verified against
// all 47 live records, 2026-07-11). NOTE: vault folder names contain literal
// spaces ("For Review", "01 Apps") — path extraction must NOT use a
// whitespace-excluding regex, or it silently truncates to the last
// space-free segment (a real bug caught during verification: every path
// resolved to ".../Review/<file>.png" instead of ".../For Review/<file>.png").
//   1. "visual"        — a single absolute path, the whole line, spaces and all.
//   2. "ad-concept"     — a single path RELATIVE to the marketing vault root,
//                         the whole line, spaces and all.
//   3. "visual-asset"   — one line with literal `\n` escapes instead of real
//                         newlines: "Asset: <id>\nImage: <rel path>\nHeadline: ...".
//   4. "visual" (older) — a full sentence, path embedded in backticks:
//                         "See generated asset: `01 Apps/.../file.png`"
const BACKTICK_IMAGE_PATTERN = /`([^`]+\.(?:png|jpe?g|gif|webp))`/i;
const IMAGE_EXT_PATTERN = /\.(?:png|jpe?g|gif|webp)$/i;

function resolveIfImagePath(candidate) {
  if (!candidate) return null;
  const ext = path.extname(candidate).toLowerCase();
  if (!imageMimeForExt(ext)) return null;
  return candidate.startsWith('/') ? candidate : path.join(MARKETING_VAULT_ROOT, candidate);
}

export function draftAsImagePath(draftText) {
  if (!draftText) return null;

  if (draftText.includes('\\n')) {
    const pseudoLines = draftText.split('\\n').map((l) => l.trim());
    const imageLine = pseudoLines.find((l) => /^Image:/i.test(l));
    if (!imageLine) return null;
    return resolveIfImagePath(imageLine.replace(/^Image:\s*/i, '').trim());
  }

  // Only trust a single non-empty line as an image reference — a multi-line
  // draft is prose (copy records), even if it happens to mention a filename.
  const lines = draftText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 1) return null;
  const line = lines[0];

  const backtickMatch = line.match(BACKTICK_IMAGE_PATTERN);
  if (backtickMatch) return resolveIfImagePath(backtickMatch[1]);
  if (IMAGE_EXT_PATTERN.test(line)) return resolveIfImagePath(line);
  return null;
}

export function extractDecisionNotes(content) {
  const decisionMatch = content.match(/##\s*Decision\s*\n([\s\S]*)$/);
  if (!decisionMatch) return '';
  const notesMatch = decisionMatch[1].match(/\*\*Decision notes:\*\*\s*(.*)/);
  return notesMatch ? notesMatch[1].trim() : '';
}

export function extractTitle(content, fallback) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : fallback;
}

export function parseApprovalRecord(filename, content, stat) {
  const fm = parseApprovalFrontmatter(content);
  const draftText = extractDraftSection(content);
  const imagePath = draftAsImagePath(draftText);
  // Some referenced assets no longer exist on disk (stale references from the
  // May 2026 iteration cycle) — surface this so the UI shows a clear
  // "asset missing" state instead of a broken <img>, rather than pretending.
  const imageExists = imagePath ? fs.existsSync(imagePath) : false;
  return {
    filename,
    approval_id: fm.approval_id || filename.replace(/\.md$/, ''),
    app_id: fm.app_id || '',
    item_type: fm.item_type || '',
    status: fm.status || 'needs-einar-review',
    channel: fm.channel || '',
    created: fm.created || '',
    approved_at: fm.approved_at || '',
    title: extractTitle(content, filename),
    draftText: imagePath ? '' : draftText,
    imagePath,
    imageExists,
    decisionNotes: extractDecisionNotes(content),
    modifiedAt: stat.mtime,
  };
}

export function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

export function safeMdFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = path.basename(filename);
  if (base !== filename || !base.endsWith('.md')) return null;
  return base;
}

// --- App profiles (01 Apps/<App>/app-profile.md) -----------------------
//
// Real schema verified against all 9 live profiles (2026-07-11): Track Stash
// (13 sections, canonical order), Spatial Tree (10 sections, DIFFERENT order,
// missing Version Info / App Store Metadata entirely), Revivr Studios (a
// non-product "Brand Profile" with 4 extra sections no other profile has),
// plus 6 profiles this merge added. Section presence, order, and count all
// vary in practice — the parser must not assume a fixed shape. The required
// section list below comes from `10 Quell/RAD_MARKETING_IMPORT_PROTOCOL.md`
// ("Required profile sections"), not from any single file's actual content.
export const REQUIRED_APP_SECTIONS = [
  'RAD Source',
  'About',
  'Elevator Pitch',
  'Target Audience',
  'Key Features',
  'Value Proposition',
  'Marketing Readiness (from RAD)',
  'Quell Notes',
  'Campaign Ideas',
  'Research Findings',
  'Launch Readiness',
];

export const MESSAGING_FILENAME = 'MESSAGING.md';

const PLACEHOLDER_PATTERN = /^[\s\-*]*\**\s*(no .*(captured|imported)\s*yet|none (captured|yet)|needs? (rad )?(definition|confirmation|review|export)|not yet (exported|imported)).*$/i;

export function isPlaceholderSectionText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return true;
  // Only treat as placeholder if the WHOLE section is one short placeholder
  // line — a section that starts with a caveat but also has real content
  // (several profiles do this deliberately) should still count as filled.
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 2) return false;
  return lines.every((l) => PLACEHOLDER_PATTERN.test(l));
}

// Splits the body into a { "Heading Text": "content" } map, keyed exactly as
// written after `## `. Order-independent and tolerant of missing/extra/
// out-of-order sections — see the schema note above for why that matters.
export function parseSections(content) {
  const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ''); // strip frontmatter
  const sections = {};
  const headingRegex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingRegex)];
  matches.forEach((m, i) => {
    const heading = m[1].trim();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[heading] = body.slice(start, end).trim();
  });
  return sections;
}

export function parseAppProfile(folderName, content, stat) {
  const fm = parseApprovalFrontmatter(content); // same key:value frontmatter shape
  const sections = parseSections(content);
  const title = extractTitle(content, folderName);

  const presentRequired = REQUIRED_APP_SECTIONS.filter((h) => h in sections);
  const filledRequired = presentRequired.filter((h) => !isPlaceholderSectionText(sections[h]));
  // First required section that's missing or still a placeholder — lets the
  // grid deep-link straight to the section that needs attention instead of
  // just the profile page (Rule 0: land on the fix, not just its zip code).
  const firstIncompleteSection = REQUIRED_APP_SECTIONS.find((h) => !(h in sections) || isPlaceholderSectionText(sections[h])) || null;

  return {
    folderName,
    slug: fm.app_id || folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    app_id: fm.app_id || '',
    // Numeric Apple App Store ID (adam id), if recorded in frontmatter — used
    // to pull public App Store reviews on the detail page. Optional; blank
    // until an app is live and its id is added to the vault profile.
    app_store_id: (fm.app_store_id || '').replace(/\D/g, ''),
    title,
    platforms: fm.platforms || '',
    status: fm.status || '',
    app_classification: fm.app_classification || '',
    classification_rationale: fm.classification_rationale || '',
    marketing_health: fm.marketing_health || '',
    primary_channel: fm.primary_channel || '',
    last_review: fm.last_review || '',
    sections,
    completeness: { filled: filledRequired.length, total: REQUIRED_APP_SECTIONS.length },
    firstIncompleteSection,
    modifiedAt: stat.mtime,
  };
}

export function listAppFolders() {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(APPS_DIR, name, 'app-profile.md')));
}

export function findAppFolderBySlug(slug) {
  const folders = listAppFolders();
  for (const folder of folders) {
    const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseApprovalFrontmatter(content);
    if (fm.app_id === slug) return folder;
  }
  // Fallback: slugified folder name match, for any profile missing app_id.
  return folders.find((f) => f.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === slug) || null;
}

// Replaces one `## Heading` section's body in place, preserving everything
// else (frontmatter, other sections, their order). Appends the section at
// the end of the file if it doesn't exist yet — several real profiles are
// missing sections outright (e.g. Spatial Tree has no Version Info).
export function writeSection(content, heading, newBody) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // NOTE: no 'm' flag — with it, `$` matches end-of-LINE (not end-of-string),
  // so the lazy [\s\S]*? would stop after the section's first line and leave
  // every subsequent line of old content orphaned in the output. Real bug,
  // found 2026-07-08 during RAD integration Phase 3 when replacing a
  // genuinely multi-line "RAD Source" section (single-line replacements in
  // earlier testing never triggered it).
  const sectionRegex = new RegExp(`(##\\s*${escaped}\\s*\\n)([\\s\\S]*?)(?=\\n##\\s|$)`);
  const replacement = `$1${newBody.trim()}\n`;
  if (sectionRegex.test(content)) {
    return content.replace(sectionRegex, replacement);
  }
  return content.trimEnd() + `\n\n## ${heading}\n${newBody.trim()}\n`;
}

// --- Quell status page (Phase 4): vault activity + publish log + RAD bridge ---

// Honest "is marketing alive?" signal — the single most recently modified
// file anywhere in the vault. Excludes `_Archive/` on purpose: archiving old
// hallucinated content (Phase 2 truth purge) touches files today but isn't a
// sign of active marketing work, and would otherwise make a dormant vault
// look falsely alive.
export function findMostRecentVaultChange() {
  let newest = null;
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '_Archive') continue;
      // Skip symlinks outright — tooling artifacts like a Python venv
      // (10 Quell/.venv/bin/python) are not vault content, and a broken
      // symlink target throws ENOENT on stat rather than just being "old".
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }
        if (!newest || stat.mtime > newest.modifiedAt) {
          newest = { relativePath: path.relative(MARKETING_VAULT_ROOT, fullPath), modifiedAt: stat.mtime };
        }
      }
    }
  }
  walk(MARKETING_VAULT_ROOT);
  return newest;
}

// Controlled vocabulary, frozen 2026-07-09 (M1) — Channel mirrors Social
// Queue's `platform` field; Type mirrors Drops' `content_type` plus the two
// other draft origins (repost, ship note). Not hard-validated below (a
// hand-logged entry may reasonably use a value ahead of the enum), but every
// writer in this codebase should stick to these.
export const PUBLISH_CHANNELS = ['x-personal', 'x-company', 'linkedin', 'youtube-package'];
// 'repost' added M2, 2026-07-09 (Quick Repost box, plain-repost path) — a
// non-breaking addition to the M1-frozen list, not a redefinition: the
// column shape is unchanged, this just fills a value the M1 session hadn't
// needed yet (M1 only froze the *shape*, not a closed enum).
export const PUBLISH_TYPES = ['wip', 'feedback-ask', 'testflight', 'launch', 'insight', 'repost', 'repost-comment', 'ship-note'];

const PUBLISH_LOG_HEADER = `# Publish Log

One row per shipped public artifact — the antidote to the zero-publish pattern this system was built to fix. Append here whenever something goes out the door: a post, a video, a press pitch, anything a real audience sees. Drafting, approving, or generating an asset is NOT a publish — only log it once it is actually live somewhere.

| Date | Channel | Type | What | Link |
|---|---|---|---|---|
`;

// Parses `| date | channel | type | what | link |` rows. Tolerant of a
// missing file (nothing has ever been published) and of a link-less row (a
// plain repost or in-person mention has nowhere to link).
export function parsePublishLog() {
  if (!fs.existsSync(PUBLISH_LOG_PATH)) {
    return { exists: false, entries: [], lastEntry: null, daysSincePublish: null };
  }
  const content = fs.readFileSync(PUBLISH_LOG_PATH, 'utf8');
  const rowRegex = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/gm;
  const entries = [...content.matchAll(rowRegex)].map((m) => ({
    date: m[1],
    channel: m[2],
    type: m[3],
    what: m[4],
    link: m[5],
  }));
  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const lastEntry = entries[0] || null;
  return {
    exists: true,
    entries,
    lastEntry,
    daysSincePublish: lastEntry ? daysSince(lastEntry.date) : null,
  };
}

export function appendPublishLogEntry({ date, channel, type, what, link }) {
  const base = fs.existsSync(PUBLISH_LOG_PATH) ? fs.readFileSync(PUBLISH_LOG_PATH, 'utf8') : PUBLISH_LOG_HEADER;
  const row = `| ${date} | ${(channel || '').replace(/\|/g, '/')} | ${(type || '').replace(/\|/g, '/')} | ${(what || '').replace(/\|/g, '/')} | ${(link || '').replace(/\|/g, '/')} |\n`;
  fs.mkdirSync(path.dirname(PUBLISH_LOG_PATH), { recursive: true });
  fs.writeFileSync(PUBLISH_LOG_PATH, base.trimEnd() + '\n' + row, 'utf8');
}

export function ensurePublishLogExists() {
  if (!fs.existsSync(PUBLISH_LOG_PATH)) {
    fs.mkdirSync(path.dirname(PUBLISH_LOG_PATH), { recursive: true });
    fs.writeFileSync(PUBLISH_LOG_PATH, PUBLISH_LOG_HEADER, 'utf8');
  }
}

// Reads per-channel weekly targets from the vault config (M4, Phase 4) —
// Einar edits the numbers directly, no code change needed to retune. Falls
// back to the build plan's suggested defaults if the file is missing or a
// channel row isn't present, so the score tile never just breaks.
const DEFAULT_SOCIAL_TARGETS = { 'x-personal': 5, 'x-company': 2, linkedin: 2 };

export function parseSocialTargets() {
  if (!fs.existsSync(SOCIAL_TARGETS_PATH)) return { ...DEFAULT_SOCIAL_TARGETS };
  const content = fs.readFileSync(SOCIAL_TARGETS_PATH, 'utf8');
  const rowRegex = /^\|\s*([\w-]+)\s*\|\s*(\d+)\s*\|\s*$/gm;
  const targets = {};
  [...content.matchAll(rowRegex)].forEach((m) => {
    targets[m[1]] = Number(m[2]);
  });
  return Object.keys(targets).length ? targets : { ...DEFAULT_SOCIAL_TARGETS };
}

// --- Marketing Memory lesson capture (shared by Approvals and Social Queue) ---
//
// Moved here from app/api/marketing/approvals/update/route.js (M2, 2026-07-09)
// so the Social Queue's reject-with-lesson flow can feed the same file the
// same way ("same pattern as the approvals queue" — Social Plan Phase 1).
// Behavior for approvals callers is unchanged; only the source-label string
// construction moved to the call site.
export const LESSON_SECTIONS = [
  'Positioning Lessons',
  'Audience Insights',
  'Channel Learnings',
  'Campaign Results',
  'Competitive Patterns',
  'Social Voice Lessons',
];

export function appendLesson(section, note, sourceLabel, today) {
  if (!fs.existsSync(MARKETING_MEMORY_PATH)) return false;
  let content = fs.readFileSync(MARKETING_MEMORY_PATH, 'utf8');
  const line = `- [${today}] ${note} Source: ${sourceLabel}.`;
  const headerRegex = new RegExp(`(##\\s*${section}\\s*\\n)`, 'i');
  if (headerRegex.test(content)) {
    content = content.replace(headerRegex, `$1${line}\n`);
  } else {
    content = content.trimEnd() + `\n\n## ${section}\n${line}\n`;
  }
  fs.writeFileSync(MARKETING_MEMORY_PATH, content, 'utf8');
  return true;
}

// --- Drops (15 Drops/) — one folder per drop, see Phase 1/2 ---

export function listDrops() {
  if (!fs.existsSync(DROPS_DIR)) return [];
  return fs
    .readdirSync(DROPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_Intake')
    .map((d) => {
      const notePath = path.join(DROPS_DIR, d.name, 'note.md');
      if (!fs.existsSync(notePath)) return null;
      const content = fs.readFileSync(notePath, 'utf8');
      const stat = fs.statSync(notePath);
      const fm = parseApprovalFrontmatter(content); // same key:value frontmatter shape
      const titleMatch = content.match(/^#\s+(.+)$/m);
      return {
        drop_id: fm.drop_id || d.name,
        folder: d.name,
        date: fm.date || '',
        app: fm.app || '',
        content_type: fm.content_type || '',
        media_cleared: fm.media_cleared || '',
        media: fm.media ? fm.media.split(',').map((s) => s.trim()).filter(Boolean) : [],
        title: titleMatch ? titleMatch[1].trim() : d.name,
        modifiedAt: stat.mtime,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}

export function updateDropFrontmatter(folder, updates) {
  const notePath = path.join(DROPS_DIR, folder, 'note.md');
  if (!fs.existsSync(notePath)) return false;
  const content = fs.readFileSync(notePath, 'utf8');
  fs.writeFileSync(notePath, updateFrontmatterFields(content, updates), 'utf8');
  return true;
}

// --- Social Queue (16 Social Queue/) — one file per draft, see Phase 1/2 ---

export function extractCopySection(content) {
  const m = content.match(/##\s*Copy\s*\n([\s\S]*?)(?=\n##\s|$)/);
  return m ? m[1].trim() : '';
}

export function parseSocialQueueRecord(filename, content, stat) {
  const fm = parseApprovalFrontmatter(content); // same key:value frontmatter shape
  return {
    filename,
    draft_id: fm.draft_id || filename.replace(/\.md$/, ''),
    platform: fm.platform || '',
    status: fm.status || 'drafted',
    approved_at: fm.approved_at || '',
    source: fm.source || '',
    content_type: fm.content_type || '',
    media: fm.media || '',
    posted_url: fm.posted_url || '',
    posted_at: fm.posted_at || '',
    lesson: fm.lesson || '',
    title: extractTitle(content, filename),
    copy: extractCopySection(content),
    hasOriginalDraft: /##\s*Original Draft\s*\n/i.test(content),
    modifiedAt: stat.mtime,
  };
}

export function listSocialQueueDrafts() {
  if (!fs.existsSync(SOCIAL_QUEUE_DIR)) return [];
  return fs
    .readdirSync(SOCIAL_QUEUE_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.md'))
    .map((d) => {
      const filePath = path.join(SOCIAL_QUEUE_DIR, d.name);
      const content = fs.readFileSync(filePath, 'utf8');
      const stat = fs.statSync(filePath);
      return parseSocialQueueRecord(d.name, content, stat);
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}

// Sets one or more frontmatter keys in place, preserving key order and any
// keys not mentioned. Appends a key at the end of the frontmatter block if
// it doesn't already exist (a queue record's template always includes all
// known keys, but defensive against a hand-edited file that doesn't).
export function updateFrontmatterFields(content, updates) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;
  const seen = new Set();
  let lines = fmMatch[1].split('\n').map((line) => {
    if (/^\s/.test(line)) return line; // indented list items (e.g. related: - "...")
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return line;
    const key = line.slice(0, colonIndex).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}: ${updates[key]}`;
    }
    return line;
  });
  Object.keys(updates).forEach((key) => {
    if (!seen.has(key)) lines.push(`${key}: ${updates[key]}`);
  });
  return content.replace(fmMatch[1], lines.join('\n'));
}

// Read-only. Known-stale as of the 2026-07-08 audit (one project, exported
// 2026-05-18) — this renders the bridge honestly; it does not import or fix it.
// RAD integration Phase 3: the marketing bridge JSON (a stale, one-shot
// export dump) is retired. RAD truth is now read live from
// VisionAppDev/RAD/*.md on every call — there is no export step to go stale.
export function readRadPortfolio() {
  const slugs = listRadSlugs();
  if (slugs.length === 0) return { exists: false, projects: [] };

  let mostRecent = null;
  const projects = slugs.map((slug) => {
    const filePath = radFilePath(slug);
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const p = parseRadProject(slug, content, stat);
    if (!mostRecent || stat.mtime > mostRecent.modifiedAt) {
      mostRecent = { slug, modifiedAt: stat.mtime };
    }
    return {
      slug: p.slug,
      name: p.name,
      lifecycleStatus: p.lifecycle_status,
      healthStatus: p.health_status,
      appClassification: p.app_classification,
    };
  });

  return { exists: true, mostRecentUpdate: mostRecent, projects };
}

// Marketing app_id values occasionally differ from the RAD slug for the
// same real app (different naming histories). Only two known mismatches as
// of Phase 3 — everything else matches by slug directly.
const MARKETING_APP_ID_TO_RAD_SLUG = {
  'vision-markup': 'vison-pro-markup', // RAD's own slug has a typo, preserved as-is (see Phase 1)
  'stare-and-share': 'stare-share',
};

// Looks up the live RAD record for a marketing app profile, by matching
// app_id to a RAD slug. Returns null if this app has no RAD record yet
// (common — most apps predate the RAD integration or were never RAD-tracked).
export function findLiveRadData(appId) {
  if (!appId) return null;
  const radSlug = MARKETING_APP_ID_TO_RAD_SLUG[appId] || appId;
  const filePath = radFilePath(radSlug);
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const p = parseRadProject(radSlug, content, stat);
  return {
    slug: p.slug,
    name: p.name,
    lifecycle_status: p.lifecycle_status,
    health_status: p.health_status,
    health_issues: p.health_issues,
    app_classification: p.app_classification,
    priority: p.priority,
    next_action: p.next_action,
    blocker: p.blocker,
    target_launch_date: p.target_launch_date,
    repository_url: p.repository_url,
    current_build_number: p.current_build_number,
    current_app_store_version: p.current_app_store_version,
    last_updated: p.last_updated,
  };
}
