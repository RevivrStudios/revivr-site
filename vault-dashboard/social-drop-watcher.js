#!/usr/bin/env node
// Drop watcher (Social Plan Phase 3, M3, 2026-07-09). Run on a schedule via
// its own launchd plist (com.revivr.social-drop-watcher.plist), matching
// this codebase's convention (check-sprint.sh) rather than a Node scheduler.
//
// For every drop in 15 Drops/ with no existing Social Queue draft, drafts an
// x-personal post and a LinkedIn version via OpenAI, using the live Brand
// Voice doctrine + a handful of Einar's own recent real tweets as few-shot
// reference. Deliberately does NOT draft an x-company variant yet: company
// voice is gated on the Phase-7 golden set (>=5 Einar-approved company
// posts), which doesn't exist yet — drafting company copy now would just be
// unanchored guessing with nothing to ground it, so that channel is deferred
// to M6 rather than drafted-then-blocked.
'use strict';

const fs = require('fs');
const path = require('path');
const {
  MARKETING_VAULT_ROOT, DROPS_DIR, loadSocialEnv, parseFrontmatter,
  listDropFolders, listQueueSources, timestampId, writeQueueDraft, callOpenAI,
  fetchRecentTweets, log,
} = require('./social-scripts-lib');

const BRAND_VOICE_PATH = path.join(MARKETING_VAULT_ROOT, '10 Quell', '06 Revivr Studios Context', 'Revivr Brand Voice.md');
const VOICE_GUIDE_PATH = path.join(MARKETING_VAULT_ROOT, '17 Voice', 'Einar Voice Guide.md');

function readBrandVoice() {
  if (!fs.existsSync(BRAND_VOICE_PATH)) return '';
  return fs.readFileSync(BRAND_VOICE_PATH, 'utf8');
}

// M6's distilled voice guide, once it exists (built from real posts, not
// invented) — read live so a re-distillation is picked up on the next run
// with no code change.
function readVoiceGuide() {
  if (!fs.existsSync(VOICE_GUIDE_PATH)) return '';
  return fs.readFileSync(VOICE_GUIDE_PATH, 'utf8');
}

function readDropNote(folder) {
  const notePath = path.join(DROPS_DIR, folder, 'note.md');
  if (!fs.existsSync(notePath)) return null;
  const content = fs.readFileSync(notePath, 'utf8');
  const fm = parseFrontmatter(content);
  const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').replace(/\n##\s*Media[\s\S]*$/, '').trim();
  return { fm, body };
}

async function draftPersonalPost({ apiKey, brandVoice, voiceGuide, recentTweets, dropText }) {
  const examples = recentTweets.slice(0, 8).map((t) => `- "${t.text.replace(/\s+/g, ' ').trim()}"`).join('\n');
  const system = `You draft a single X (Twitter) post in Einar Johnson's own first-person voice (@EinarJohnson_XR), founder of Revivr Studios, sharing a work-in-progress update about one of his apps.

${brandVoice}

${voiceGuide ? `Distilled voice guide from his real posts:\n${voiceGuide}\n` : ''}
Here are real examples of Einar's own recent posts — match this tone, not a generic "founder announcement" tone:
${examples || '(no recent examples available)'}

Rules: first person, casual, honest, no hype words (revolutionary/game-changing/disruptive/etc.), no fabricated claims beyond what's in the note, max 280 characters, at most 1 hashtag (often zero), a soft ask (feedback/TestFlight interest) only if it fits naturally. Output ONLY the post text, nothing else — no quotes, no preamble.`;
  return callOpenAI({ apiKey, system, user: dropText, maxTokens: 200 });
}

async function draftLinkedInPost({ apiKey, brandVoice, dropText }) {
  const system = `You draft a single LinkedIn post in Einar Johnson's voice, founder of Revivr Studios, sharing a work-in-progress update about one of his apps for a more professional (but still human) audience.

${brandVoice}

Rules: first person, competent and warm (not corporate), no hype words, no fabricated claims beyond what's in the note, 2-4 short paragraphs, no fabricated hashtags. Output ONLY the post text, nothing else — no quotes, no preamble.`;
  return callOpenAI({ apiKey, system, user: dropText, maxTokens: 400 });
}

async function main() {
  const env = loadSocialEnv();
  if (!env.OPENAI_API_KEY) {
    log('OPENAI_API_KEY missing from ~/.revivr/social.env — nothing to do.');
    return;
  }

  const alreadyDrafted = listQueueSources();
  const drops = listDropFolders().filter((folder) => !alreadyDrafted.has(folder));
  if (drops.length === 0) {
    log('No undrafted drops.');
    return;
  }

  const brandVoice = readBrandVoice();
  const voiceGuide = readVoiceGuide();
  let recentTweets = [];
  if (env.X_BEARER_TOKEN && env.X_PERSONAL_ACCESS_TOKEN) {
    const personalUserId = env.X_PERSONAL_ACCESS_TOKEN.split('-')[0];
    recentTweets = await fetchRecentTweets({ bearerToken: env.X_BEARER_TOKEN, userId: personalUserId, maxResults: 10 }).catch(() => []);
  }

  for (const folder of drops) {
    const note = readDropNote(folder);
    if (!note || !note.body) {
      log(`Skipping ${folder} — no readable note body.`);
      continue;
    }
    const dropText = `App: ${note.fm.app || '(unspecified)'}\nType: ${note.fm.content_type || 'wip'}\n\n${note.body}`;
    log(`Drafting for ${folder}...`);

    try {
      const personalCopy = await draftPersonalPost({ apiKey: env.OPENAI_API_KEY, brandVoice, voiceGuide, recentTweets, dropText });
      if (personalCopy) {
        writeQueueDraft({
          draftId: timestampId('draft'),
          platform: 'x-personal',
          source: folder,
          contentType: note.fm.content_type || 'wip',
          title: `Draft — x-personal — ${folder}`,
          copy: personalCopy,
        });
        log(`  wrote x-personal draft for ${folder}`);
      }
    } catch (err) {
      log(`  FAILED x-personal draft for ${folder}: ${err.message}`);
    }

    try {
      const linkedinCopy = await draftLinkedInPost({ apiKey: env.OPENAI_API_KEY, brandVoice, dropText });
      if (linkedinCopy) {
        writeQueueDraft({
          draftId: timestampId('draft'),
          platform: 'linkedin',
          source: folder,
          contentType: note.fm.content_type || 'wip',
          title: `Draft — linkedin — ${folder}`,
          copy: linkedinCopy,
        });
        log(`  wrote linkedin draft for ${folder}`);
      }
    } catch (err) {
      log(`  FAILED linkedin draft for ${folder}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
