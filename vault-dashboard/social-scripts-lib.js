// Shared helpers for the standalone social-pipeline scheduled scripts
// (social-drop-watcher.js, social-repost-scout.js). CommonJS, not part of the
// Next.js app — these run via `node script.js` from their own launchd
// plists, matching this codebase's established scheduled-job convention
// (check-sprint.sh, Quinn's watcher plists) rather than a Node/npm scheduler
// (no node-cron anywhere in this system). Deliberately duplicates a small
// amount of logic from app/api/marketing/_shared.js and _env.js rather than
// importing them — those are ES modules transpiled by Next.js; a standalone
// script run directly by `node` needs its own CommonJS-compatible copy.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MARKETING_VAULT_ROOT = path.join(
  os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'Revivr Marketing'
);
const DROPS_DIR = path.join(MARKETING_VAULT_ROOT, '15 Drops');
const SOCIAL_QUEUE_DIR = path.join(MARKETING_VAULT_ROOT, '16 Social Queue');
const SOCIAL_ENV_PATH = path.join(os.homedir(), '.revivr', 'social.env');

function loadSocialEnv() {
  const values = {};
  if (!fs.existsSync(SOCIAL_ENV_PATH)) return values;
  fs.readFileSync(SOCIAL_ENV_PATH, 'utf8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq === -1) return;
    values[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  });
  return values;
}

function parseFrontmatter(content) {
  const fm = {};
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (m) {
    m[1].split('\n').forEach((line) => {
      if (/^\s/.test(line)) return;
      const i = line.indexOf(':');
      if (i === -1) return;
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  }
  return fm;
}

function listDropFolders() {
  if (!fs.existsSync(DROPS_DIR)) return [];
  return fs.readdirSync(DROPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_Intake')
    .map((d) => d.name);
}

// Every source already drafted for, across all queue records (any status) —
// used to decide which drops/tweets still need a first draft.
function listQueueSources() {
  const sources = new Set();
  if (!fs.existsSync(SOCIAL_QUEUE_DIR)) return sources;
  fs.readdirSync(SOCIAL_QUEUE_DIR).filter((f) => f.endsWith('.md')).forEach((f) => {
    const content = fs.readFileSync(path.join(SOCIAL_QUEUE_DIR, f), 'utf8');
    const fm = parseFrontmatter(content);
    if (fm.source) sources.add(fm.source);
  });
  return sources;
}

function timestampId(prefix) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeQueueDraft({ draftId, platform, source, contentType, title, copy }) {
  const noteContent = `---
draft_id: ${draftId}
platform: ${platform}
status: drafted
source: ${source}
content_type: ${contentType}
media:
posted_url:
posted_at:
lesson:
media_cleared:
---

# ${title}

## Copy
${copy}
`;
  fs.mkdirSync(SOCIAL_QUEUE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SOCIAL_QUEUE_DIR, `${draftId}.md`), noteContent, 'utf8');
}

async function callOpenAI({ apiKey, model = 'gpt-5.4-mini', system, user, maxTokens = 300 }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: maxTokens,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${JSON.stringify(data)}`);
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function fetchRecentTweets({ bearerToken, userId, maxResults = 10 }) {
  const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&exclude=retweets,replies&tweet.fields=public_metrics`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
  const data = await res.json();
  if (!res.ok) return [];
  return data.data || [];
}

async function searchRecentTweets({ bearerToken, query, maxResults = 25 }) {
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(`${query} -is:retweet lang:en`)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id&sort_order=relevancy`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
  const data = await res.json();
  if (!res.ok) {
    log(`search failed for "${query}": ${JSON.stringify(data)}`);
    return [];
  }
  return data.data || [];
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

module.exports = {
  MARKETING_VAULT_ROOT, DROPS_DIR, SOCIAL_QUEUE_DIR, SOCIAL_ENV_PATH,
  loadSocialEnv, parseFrontmatter, listDropFolders, listQueueSources,
  timestampId, writeQueueDraft, callOpenAI, fetchRecentTweets, searchRecentTweets, log,
};
