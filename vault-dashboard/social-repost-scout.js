#!/usr/bin/env node
// Repost scout (Social Plan Phase 3, M3, 2026-07-09). Run a few times a day
// via its own launchd plist (com.revivr.social-repost-scout.plist). Reuses
// twitter-curator-bot's scout.py query/scoring approach (recent search,
// score = likes + retweets*2 + replies*3) against the proven-engagement
// lane the plan names explicitly: Vision Pro / visionOS / spatial
// accessibility / ALS content Einar already gets responses reposting and
// commenting on. Drafts quote-comments only — never auto-posts; Einar
// reviews and Approves & Posts (or Copies) like any other queue draft.
'use strict';

const {
  loadSocialEnv, listQueueSources, timestampId, writeQueueDraft,
  callOpenAI, fetchRecentTweets, searchRecentTweets, log,
} = require('./social-scripts-lib');

const QUERIES = ['Vision Pro', 'visionOS dev', 'spatial accessibility', 'ALS tech'];
const MIN_LIKES = 5;
const TOP_N = 3;

function score(tweet) {
  const m = tweet.public_metrics || {};
  return (m.like_count || 0) + (m.retweet_count || 0) * 2 + (m.reply_count || 0) * 3;
}

async function draftQuoteComment({ apiKey, brandVoiceExamples, tweetText }) {
  const examples = brandVoiceExamples.slice(0, 8).map((t) => `- "${t.text.replace(/\s+/g, ' ').trim()}"`).join('\n');
  const system = `You draft a short quote-comment in Einar Johnson's own first-person voice (@EinarJohnson_XR) reacting to someone else's X post about Vision Pro / visionOS / spatial computing / accessibility tech.

Here are real examples of Einar's own recent posts — match this tone:
${examples || '(no recent examples available)'}

Rules: first person, genuine reaction (not generic hype), specific to what the post actually shows or says, no fabricated claims, max 250 characters (leaving room for the quoted post), no hashtag stuffing. Output ONLY the comment text, nothing else.`;
  return callOpenAI({ apiKey, system, user: tweetText, maxTokens: 150 });
}

async function main() {
  const env = loadSocialEnv();
  if (!env.OPENAI_API_KEY || !env.X_BEARER_TOKEN) {
    log('OPENAI_API_KEY or X_BEARER_TOKEN missing — nothing to do.');
    return;
  }

  const alreadyDrafted = listQueueSources();
  const seen = new Map();
  for (const query of QUERIES) {
    const results = await searchRecentTweets({ bearerToken: env.X_BEARER_TOKEN, query, maxResults: 25 });
    for (const tweet of results) {
      if ((tweet.public_metrics?.like_count || 0) < MIN_LIKES) continue;
      const sourceUrl = `https://x.com/i/status/${tweet.id}`;
      if (alreadyDrafted.has(sourceUrl)) continue;
      if (!seen.has(tweet.id)) seen.set(tweet.id, tweet);
    }
  }

  const candidates = [...seen.values()].sort((a, b) => score(b) - score(a)).slice(0, TOP_N);
  if (candidates.length === 0) {
    log('No new repost candidates above threshold.');
    return;
  }

  let recentTweets = [];
  if (env.X_PERSONAL_ACCESS_TOKEN) {
    const personalUserId = env.X_PERSONAL_ACCESS_TOKEN.split('-')[0];
    recentTweets = await fetchRecentTweets({ bearerToken: env.X_BEARER_TOKEN, userId: personalUserId, maxResults: 10 }).catch(() => []);
  }

  for (const tweet of candidates) {
    const sourceUrl = `https://x.com/i/status/${tweet.id}`;
    log(`Drafting quote-comment for ${sourceUrl} (score ${score(tweet)})`);
    try {
      const comment = await draftQuoteComment({ apiKey: env.OPENAI_API_KEY, brandVoiceExamples: recentTweets, tweetText: tweet.text });
      if (!comment) continue;
      writeQueueDraft({
        draftId: timestampId('draft_repost'),
        platform: 'x-personal',
        source: sourceUrl,
        contentType: 'repost-comment',
        title: `Repost scout — ${sourceUrl}`,
        copy: comment,
      });
      log(`  wrote draft for ${sourceUrl}`);
    } catch (err) {
      log(`  FAILED for ${sourceUrl}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
