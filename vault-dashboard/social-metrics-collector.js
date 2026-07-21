#!/usr/bin/env node
// Metrics collector (Social Plan Phase 5, M5, 2026-07-09). Runs once daily
// via its own launchd plist (com.revivr.social-metrics-collector.plist),
// same standalone-script convention as M3's watcher/scout.
//
// Snapshots CURRENT engagement for every PUBLISH_LOG entry that has a link,
// per channel, into 06 Metrics/<channel>/YYYY-MM-DD.md — a full snapshot
// every day (not just new posts), because the X API only returns a tweet's
// CURRENT metrics, never history. Multiple days' snapshot files are what
// let the report page build a trend line.
//
// Correction vs. the plan's assumption: `public_metrics` (likes, retweets,
// replies, quotes, AND impression_count) is available via Bearer alone for
// any tweet — verified live during M2/M5. The plan assumed impressions
// needed the user token; that's only true for non_public/organic metrics
// (profile clicks, video views, etc.), which this collector does not need
// and does not fetch.
'use strict';

const fs = require('fs');
const path = require('path');
const { MARKETING_VAULT_ROOT, loadSocialEnv, log } = require('./social-scripts-lib');

const METRICS_DIR = path.join(MARKETING_VAULT_ROOT, '06 Metrics');
const PUBLISH_LOG_PATH = path.join(MARKETING_VAULT_ROOT, '09 Meta', 'PUBLISH_LOG.md');

function parsePublishLog() {
  if (!fs.existsSync(PUBLISH_LOG_PATH)) return [];
  const content = fs.readFileSync(PUBLISH_LOG_PATH, 'utf8');
  const rowRegex = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/gm;
  return [...content.matchAll(rowRegex)].map((m) => ({ date: m[1], channel: m[2], type: m[3], what: m[4], link: m[5] }));
}

function tweetIdFromUrl(url) {
  if (!url) return null;
  const m = url.match(/status(?:es)?\/(\d+)/);
  return m ? m[1] : null;
}

async function fetchMetricsBatch(bearerToken, ids) {
  if (ids.length === 0) return {};
  const url = `https://api.twitter.com/2/tweets?ids=${ids.join(',')}&tweet.fields=public_metrics,created_at`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
  const data = await res.json();
  if (!res.ok) {
    log(`fetchMetricsBatch failed: ${JSON.stringify(data)}`);
    return {};
  }
  const byId = {};
  (data.data || []).forEach((t) => { byId[t.id] = t; });
  return byId;
}

function writeSnapshot(channel, rows) {
  const dir = path.join(METRICS_DIR, channel);
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().split('T')[0];
  const header = `# ${channel} Metrics — ${today}\n\n| Tweet URL | Posted | Type | Likes | Retweets | Replies | Quotes | Impressions |\n|---|---|---|---|---|---|---|---|\n`;
  const body = rows.map((r) => `| ${r.link} | ${r.date} | ${r.type} | ${r.likes} | ${r.retweets} | ${r.replies} | ${r.quotes} | ${r.impressions} |`).join('\n');
  fs.writeFileSync(path.join(dir, `${today}.md`), header + body + '\n', 'utf8');
  log(`  wrote ${rows.length} row(s) to ${channel}/${today}.md`);
}

async function main() {
  const env = loadSocialEnv();
  if (!env.X_BEARER_TOKEN) {
    log('X_BEARER_TOKEN missing — nothing to do.');
    return;
  }

  const entries = parsePublishLog().filter((e) => tweetIdFromUrl(e.link));
  if (entries.length === 0) {
    log('No PUBLISH_LOG entries with a tweet link yet.');
    return;
  }

  const byChannel = {};
  entries.forEach((e) => {
    (byChannel[e.channel] = byChannel[e.channel] || []).push(e);
  });

  for (const [channel, channelEntries] of Object.entries(byChannel)) {
    const ids = channelEntries.map((e) => tweetIdFromUrl(e.link));
    const uniqueIds = [...new Set(ids)];
    const metricsById = await fetchMetricsBatch(env.X_BEARER_TOKEN, uniqueIds).catch((err) => {
      log(`  FAILED fetching metrics for ${channel}: ${err.message}`);
      return {};
    });

    const rows = channelEntries.map((e) => {
      const id = tweetIdFromUrl(e.link);
      const m = metricsById[id]?.public_metrics || {};
      return {
        link: e.link,
        date: e.date,
        type: e.type,
        likes: m.like_count ?? 0,
        retweets: m.retweet_count ?? 0,
        replies: m.reply_count ?? 0,
        quotes: m.quote_count ?? 0,
        impressions: m.impression_count ?? 0,
      };
    });
    writeSnapshot(channel, rows);
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
