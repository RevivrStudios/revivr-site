#!/usr/bin/env node
// Einar voice corpus collector (Social Plan Phase 7, M6, 2026-07-09). Runs
// weekly via its own launchd plist. Pulls @EinarJohnson_XR's own timeline
// (Bearer, public data) into 17 Voice/Einar Posts/timeline.md — full history
// on the first run (paginated), incremental (stops at the newest already-
// known tweet) every run after. Each post stamped with its engagement
// metrics at collection time, so the highest-engagement posts can be
// weighted later by the distillation job.
'use strict';

const fs = require('fs');
const path = require('path');
const { MARKETING_VAULT_ROOT, loadSocialEnv, log } = require('./social-scripts-lib');

const VOICE_DIR = path.join(MARKETING_VAULT_ROOT, '17 Voice', 'Einar Posts');
const TIMELINE_PATH = path.join(VOICE_DIR, 'timeline.md');
const MAX_PAGES = 20; // safety cap — ~2000 tweets on a first full-history run

function parseExistingIds() {
  if (!fs.existsSync(TIMELINE_PATH)) return new Set();
  const content = fs.readFileSync(TIMELINE_PATH, 'utf8');
  const ids = new Set();
  [...content.matchAll(/^\|\s*(\d+)\s*\|/gm)].forEach((m) => ids.add(m[1]));
  return ids;
}

async function fetchAllNewTweets({ bearerToken, userId, knownIds }) {
  const collected = [];
  let nextToken = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&exclude=retweets,replies&tweet.fields=created_at,public_metrics${nextToken ? `&pagination_token=${nextToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
    const data = await res.json();
    if (!res.ok) {
      log(`fetch page ${page} failed: ${JSON.stringify(data)}`);
      break;
    }
    const tweets = data.data || [];
    let hitKnown = false;
    for (const t of tweets) {
      if (knownIds.has(t.id)) { hitKnown = true; break; }
      collected.push(t);
    }
    if (hitKnown || !data.meta?.next_token || tweets.length === 0) break;
    nextToken = data.meta.next_token;
  }
  return collected;
}

function appendToTimeline(tweets) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  const header = `# Einar Posts Timeline\n\nCollected from @EinarJohnson_XR's real X timeline (public data via Bearer). Feeds the M6 voice distillation job — top-engagement posts weighted, never used unedited as public copy (that's the whole PeriPal-class-error lesson this system exists to avoid repeating).\n\n| Tweet ID | Posted | Likes | Retweets | Replies | Impressions | Text |\n|---|---|---|---|---|---|---|\n`;
  const base = fs.existsSync(TIMELINE_PATH) ? fs.readFileSync(TIMELINE_PATH, 'utf8') : header;
  const rows = tweets.map((t) => {
    const m = t.public_metrics || {};
    const text = (t.text || '').replace(/\|/g, '/').replace(/\n/g, ' ');
    return `| ${t.id} | ${(t.created_at || '').slice(0, 10)} | ${m.like_count ?? 0} | ${m.retweet_count ?? 0} | ${m.reply_count ?? 0} | ${m.impression_count ?? 0} | ${text} |`;
  });
  fs.writeFileSync(TIMELINE_PATH, base.trimEnd() + '\n' + rows.join('\n') + '\n', 'utf8');
}

async function main() {
  const env = loadSocialEnv();
  if (!env.X_BEARER_TOKEN || !env.X_PERSONAL_ACCESS_TOKEN) {
    log('X_BEARER_TOKEN or X_PERSONAL_ACCESS_TOKEN missing — nothing to do.');
    return;
  }
  const userId = env.X_PERSONAL_ACCESS_TOKEN.split('-')[0];
  const knownIds = parseExistingIds();
  log(knownIds.size === 0 ? 'No existing timeline — running full-history collection.' : `Incremental run, ${knownIds.size} known posts.`);

  const newTweets = await fetchAllNewTweets({ bearerToken: env.X_BEARER_TOKEN, userId, knownIds });
  if (newTweets.length === 0) {
    log('No new posts.');
    return;
  }
  appendToTimeline(newTweets);
  log(`Appended ${newTweets.length} new post(s) to timeline.md.`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
