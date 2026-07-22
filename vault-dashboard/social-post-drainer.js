#!/usr/bin/env node
// social-post-drainer — publishes APPROVED social-queue drafts one at a time
// with spacing, so a review session that approves several drafts doesn't
// fire them all simultaneously.
//
// Runs every 10 minutes via launchd (com.revivr.social-post-drainer). Each
// tick posts AT MOST ONE item, and only when:
//   - there is an approved draft on an API platform (oldest approved_at first),
//   - at least SOCIAL_POST_GAP_MINUTES (default 60) have passed since the last
//     successful API post (state written by the approve route, so manual
//     "Post now" clicks also reset the clock),
//   - local time is inside the posting window (default 08:00-21:00).
// Posting goes through the site's own /api/.../approve {mode:'now'} so every
// rule (tier fallback, publish log, status flip) lives in exactly one place.
//
// Usage: node social-post-drainer.js [--dry-run]

const fs = require('fs');
const path = require('path');

const BASE = process.env.DASHBOARD_URL || 'http://localhost:3000';
const GAP_MIN = parseInt(process.env.SOCIAL_POST_GAP_MINUTES || envFromFile('SOCIAL_POST_GAP_MINUTES') || '60', 10);
const WINDOW_START = parseInt(process.env.SOCIAL_POST_WINDOW_START || envFromFile('SOCIAL_POST_WINDOW_START') || '8', 10);
const WINDOW_END = parseInt(process.env.SOCIAL_POST_WINDOW_END || envFromFile('SOCIAL_POST_WINDOW_END') || '21', 10);
const STATE_FILE = path.join(__dirname, 'data', 'social', 'post-drainer-state.json');
const API_PLATFORMS = ['x-personal', 'x-company', 'linkedin'];
const DRY = process.argv.includes('--dry-run');
const SOCIAL_ENV = path.join(require('os').homedir(), '.revivr', 'social.env');

// LinkedIn member tokens live ~60 days and can't silently refresh — warn
// Einar via Telegram starting 7 days out (once per day) so re-consent
// (node linkedin-oauth-setup.js) is a ritual, not an outage discovered later.
function checkLinkedinExpiry(state) {
  try {
    const env = fs.readFileSync(SOCIAL_ENV, 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('LINKEDIN_TOKEN_EXPIRES='));
    if (!line) return;
    const daysLeft = (Date.parse(line.split('=')[1]) - Date.now()) / 86400000;
    const today = new Date().toISOString().slice(0, 10);
    if (daysLeft < 7 && state.lastLinkedinWarn !== today) {
      const msg = daysLeft < 0
        ? '🔗 LinkedIn token EXPIRED — LinkedIn drafts fell back to Copy. Run: node linkedin-oauth-setup.js (in the dashboard runtime dir) and click Allow.'
        : `🔗 LinkedIn token expires in ${Math.max(0, Math.floor(daysLeft))} day(s). Run: node linkedin-oauth-setup.js and click Allow to renew (10 seconds).`;
      const { execFileSync } = require('child_process');
      execFileSync('/opt/homebrew/bin/openclaw', ['message', 'send', '--channel', 'telegram', '--target', '8065739797', '--message', msg], {
        env: { ...process.env, PATH: `/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:${process.env.PATH || '/usr/bin:/bin'}` },
        timeout: 60000,
      });
      state.lastLinkedinWarn = today;
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
    }
  } catch (err) {
    console.error('linkedin expiry check failed:', String(err.message || err).slice(0, 120));
  }
}

function envFromFile(key) {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : '';
  } catch {
    return '';
  }
}

async function main() {
  const token = envFromFile('DASHBOARD_TOKEN');
  if (!token) {
    console.error('no DASHBOARD_TOKEN in .env.local; aborting');
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const hour = new Date().getHours();
  if (hour < WINDOW_START || hour >= WINDOW_END) {
    console.log(`outside posting window (${WINDOW_START}:00-${WINDOW_END}:00); nothing to do`);
    return;
  }

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }
  checkLinkedinExpiry(state);
  const lastPostedAt = Date.parse(state.lastPostedAt) || 0;
  const minutesSince = (Date.now() - lastPostedAt) / 60000;
  if (minutesSince < GAP_MIN) {
    console.log(`last post ${minutesSince.toFixed(0)}m ago (< ${GAP_MIN}m gap); waiting`);
    return;
  }

  const res = await fetch(`${BASE}/api/marketing/social/queue`, { headers });
  const drafts = (await res.json()).drafts || [];
  const ready = drafts
    .filter((d) => d.status === 'approved' && API_PLATFORMS.includes(d.platform))
    .sort((a, b) => String(a.approved_at).localeCompare(String(b.approved_at)));

  if (!ready.length) {
    console.log('no approved drafts waiting');
    return;
  }

  const next = ready[0];
  console.log(`posting ${next.filename} (approved ${next.approved_at}; ${ready.length - 1} more waiting)`);
  if (DRY) {
    console.log('DRY RUN — would POST approve {mode:"now"}');
    return;
  }

  const post = await fetch(`${BASE}/api/marketing/social/queue/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename: next.filename, mode: 'now' }),
  });
  const result = await post.json().catch(() => ({}));
  if (post.ok && result.success) {
    console.log(`posted: ${result.posted_url || '(no url returned)'}`);
  } else {
    // Leave the item approved — transient X errors recover on a later tick,
    // and everything durable was already validated at approval time.
    console.error(`post failed (${post.status}): ${result.error || 'unknown'} — will retry next tick`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
