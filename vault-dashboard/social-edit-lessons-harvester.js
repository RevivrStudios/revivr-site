#!/usr/bin/env node
// Edit-lessons harvester (Social Plan Phase 7, M6, 2026-07-09). Runs weekly.
// Mines Social Queue drafts for the `## Original Draft` section the Phase-2
// Edit action preserves on first edit, appends before/after + an inferred
// rule to 17 Voice/Edit Lessons.md — "the highest-signal voice data,"
// per the plan. Always captures the raw before/after even if the OpenAI
// rule-inference call fails, so no signal is silently lost.
'use strict';

const fs = require('fs');
const path = require('path');
const { MARKETING_VAULT_ROOT, SOCIAL_QUEUE_DIR, loadSocialEnv, parseFrontmatter, callOpenAI, log } = require('./social-scripts-lib');

const EDIT_LESSONS_PATH = path.join(MARKETING_VAULT_ROOT, '17 Voice', 'Edit Lessons.md');

function extractSection(content, heading) {
  const re = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
  const m = content.match(re);
  return m ? m[1].trim() : '';
}

function stampHarvested(filePath, content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return;
  let lines = fmMatch[1].split('\n');
  let found = false;
  lines = lines.map((line) => {
    if (/^edit_lesson_harvested:/.test(line.trim())) { found = true; return 'edit_lesson_harvested: true'; }
    return line;
  });
  if (!found) lines.push('edit_lesson_harvested: true');
  const updated = content.replace(fmMatch[1], lines.join('\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
}

async function inferRule({ apiKey, before, after }) {
  const system = `Given a before/after edit of a social media draft, state the general writing rule the edit demonstrates, in one sentence. Be specific and actionable, not vague ("be more concise" is too vague; "cut the trailing hashtag block" is specific).`;
  const user = `Before: "${before}"\n\nAfter: "${after}"`;
  return callOpenAI({ apiKey, system, user, maxTokens: 80 });
}

function appendLesson({ before, after, rule, source }) {
  const dir = path.dirname(EDIT_LESSONS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const header = `# Edit Lessons\n\nBefore/after pairs from real edits on the Social tab — the highest-signal voice data available, since Einar himself made the change. Feeds every drafting prompt.\n\n`;
  const base = fs.existsSync(EDIT_LESSONS_PATH) ? fs.readFileSync(EDIT_LESSONS_PATH, 'utf8') : header;
  const entry = `## ${source}\n**Before:** ${before}\n**After:** ${after}\n**Rule:** ${rule || '(rule inference unavailable — OpenAI call failed, raw pair still captured)'}\n\n`;
  fs.writeFileSync(EDIT_LESSONS_PATH, base.trimEnd() + '\n\n' + entry, 'utf8');
}

async function main() {
  const env = loadSocialEnv();
  if (!fs.existsSync(SOCIAL_QUEUE_DIR)) {
    log('No Social Queue directory yet.');
    return;
  }
  const files = fs.readdirSync(SOCIAL_QUEUE_DIR).filter((f) => f.endsWith('.md'));
  let harvested = 0;
  for (const file of files) {
    const filePath = path.join(SOCIAL_QUEUE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    if (fm.edit_lesson_harvested === 'true') continue;
    const original = extractSection(content, 'Original Draft');
    const current = extractSection(content, 'Copy');
    if (!original || !current) continue;

    let rule = null;
    if (env.OPENAI_API_KEY) {
      rule = await inferRule({ apiKey: env.OPENAI_API_KEY, before: original, after: current }).catch((err) => {
        log(`  rule inference failed for ${file}: ${err.message}`);
        return null;
      });
    }
    appendLesson({ before: original, after: current, rule, source: file });
    stampHarvested(filePath, content);
    harvested += 1;
    log(`Harvested edit lesson from ${file}${rule ? '' : ' (raw pair only, no rule)'}`);
  }
  if (harvested === 0) log('No new edited drafts to harvest.');
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exitCode = 1;
});
