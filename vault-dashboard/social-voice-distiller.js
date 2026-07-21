#!/usr/bin/env node
// Voice distillation job (Social Plan Phase 7, M6, 2026-07-09). Runs weekly;
// only actually calls OpenAI when triggered (30+ days since last distillation,
// or 25+ new posts collected since then — the plan's own cadence rule).
// Produces 17 Voice/Einar Voice Guide.md: sentence patterns, openings,
// vocabulary, do/don't pairs QUOTED from real posts (top-engagement
// weighted) — never invented examples (that's the PeriPal-class error).
'use strict';

const fs = require('fs');
const path = require('path');
const { MARKETING_VAULT_ROOT, loadSocialEnv, callOpenAI, log } = require('./social-scripts-lib');

const VOICE_DIR = path.join(MARKETING_VAULT_ROOT, '17 Voice');
const TIMELINE_PATH = path.join(VOICE_DIR, 'Einar Posts', 'timeline.md');
const GUIDE_PATH = path.join(VOICE_DIR, 'Einar Voice Guide.md');
const NEW_POSTS_TRIGGER = 25;
const DAYS_TRIGGER = 30;
const TOP_N = 40;

function parseTimeline() {
  if (!fs.existsSync(TIMELINE_PATH)) return [];
  const content = fs.readFileSync(TIMELINE_PATH, 'utf8');
  const rowRegex = /^\|\s*(\d+)\s*\|\s*(\S*)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*$/gm;
  return [...content.matchAll(rowRegex)].map((m) => ({
    id: m[1], date: m[2], likes: +m[3], retweets: +m[4], replies: +m[5], impressions: +m[6], text: m[7],
  }));
}

function parseGuideFrontmatter() {
  if (!fs.existsSync(GUIDE_PATH)) return { post_count_at_last_distillation: 0, last_distilled: null };
  const content = fs.readFileSync(GUIDE_PATH, 'utf8');
  const fm = {};
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (m) {
    m[1].split('\n').forEach((line) => {
      const i = line.indexOf(':');
      if (i === -1) return;
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  }
  return {
    post_count_at_last_distillation: Number(fm.post_count_at_last_distillation || 0),
    last_distilled: fm.last_distilled || null,
  };
}

function shouldDistill(totalPosts, state) {
  if (!state.last_distilled) return true;
  const daysSince = (Date.now() - new Date(state.last_distilled).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= DAYS_TRIGGER) return true;
  if (totalPosts - state.post_count_at_last_distillation >= NEW_POSTS_TRIGGER) return true;
  return false;
}

async function main() {
  const env = loadSocialEnv();
  if (!env.OPENAI_API_KEY) {
    log('OPENAI_API_KEY missing — nothing to do.');
    return;
  }
  const posts = parseTimeline();
  if (posts.length === 0) {
    log('No timeline data yet — run social-voice-collector.js first.');
    return;
  }
  const state = parseGuideFrontmatter();
  if (!shouldDistill(posts.length, state)) {
    log(`Not due yet (${posts.length} posts, ${posts.length - state.post_count_at_last_distillation} new since last distillation).`);
    return;
  }

  const scored = posts
    .map((p) => ({ ...p, score: p.likes + p.retweets * 2 + p.replies * 3 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  const examples = scored.map((p) => `[${p.score} pts] "${p.text}"`).join('\n');
  const system = `You analyze a founder's real X posts to distill his authentic writing voice into a reference guide for other drafts to imitate. You must ONLY quote or closely paraphrase from the real posts given — never invent an example post. Output markdown with these sections: "## Sentence Patterns", "## Common Openings", "## Vocabulary" (words/phrases he actually uses), "## Do", "## Don't" (each as a bulleted list, each bullet quoting or directly referencing a real post as evidence).`;
  const user = `Real posts, ranked by engagement (score = likes + retweets*2 + replies*3), highest first:\n\n${examples}`;

  try {
    const guide = await callOpenAI({ apiKey: env.OPENAI_API_KEY, system, user, maxTokens: 1200 });
    const today = new Date().toISOString().split('T')[0];
    const content = `---
post_count_at_last_distillation: ${posts.length}
last_distilled: ${today}
---

# Einar Voice Guide

Distilled from ${posts.length} real posts (top ${scored.length} by engagement used as source material). Feeds every drafting prompt in the social pipeline. Re-distilled after ${NEW_POSTS_TRIGGER}+ new posts or ${DAYS_TRIGGER}+ days.

${guide}
`;
    fs.mkdirSync(VOICE_DIR, { recursive: true });
    fs.writeFileSync(GUIDE_PATH, content, 'utf8');
    log(`Distilled voice guide from ${scored.length} top posts, ${posts.length} total known.`);
  } catch (err) {
    log(`FAILED distillation: ${err.message}`);
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
