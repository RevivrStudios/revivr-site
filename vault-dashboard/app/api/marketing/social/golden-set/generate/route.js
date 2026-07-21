import fs from 'fs';
import path from 'path';
import { MARKETING_VAULT_ROOT, SOCIAL_QUEUE_DIR, countGoldenSetEntries, GOLDEN_SET_MINIMUM } from '../../../_shared';
import { loadSocialEnv } from '../../_env';

const BRAND_VOICE_PATH = path.join(MARKETING_VAULT_ROOT, '10 Quell', '06 Revivr Studios Context', 'Revivr Brand Voice.md');
const CANDIDATE_COUNT = 3;

function pad(n) { return String(n).padStart(2, '0'); }
function draftIdNow(i) {
  const d = new Date();
  return `draft_golden_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${i}`;
}

async function callOpenAI({ apiKey, system, user }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_completion_tokens: 300,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${JSON.stringify(data)}`);
  return (data.choices?.[0]?.message?.content || '').trim();
}

// Bootstrap-only, manually triggered from the Social tab (not a scheduled
// job) — the golden set only needs building once, not continuously.
// Company voice is otherwise unanchored (doctrine has almost zero approved
// real examples), so these are candidates for Einar to curate via "Approve
// as Golden Example," not auto-published.
export async function POST() {
  try {
    const { values } = loadSocialEnv();
    if (!values.OPENAI_API_KEY) {
      return Response.json({ error: 'OPENAI_API_KEY missing from ~/.revivr/social.env' }, { status: 400 });
    }
    const existing = countGoldenSetEntries();
    if (existing >= GOLDEN_SET_MINIMUM) {
      return Response.json({ error: `Golden set already has ${existing} entries — no more candidates needed.` }, { status: 400 });
    }

    const brandVoice = fs.existsSync(BRAND_VOICE_PATH) ? fs.readFileSync(BRAND_VOICE_PATH, 'utf8') : '';
    const system = `You draft a short X (Twitter) post in Revivr Studios' company voice (@RevivrStudios) — a general brand post (not tied to a specific WIP update), e.g. a positioning statement, a "why we build this" post, or a values statement.

${brandVoice}

Rules: first person plural ("we"), honest, no hype words, no fabricated claims, max 280 characters. Output ONLY the post text, nothing else.`;

    const created = [];
    for (let i = 0; i < CANDIDATE_COUNT; i += 1) {
      const copy = await callOpenAI({ apiKey: values.OPENAI_API_KEY, system, user: `Candidate ${i + 1} of ${CANDIDATE_COUNT} — make it distinct from the others.` });
      if (!copy) continue;
      const draftId = draftIdNow(i);
      const content = `---
draft_id: ${draftId}
platform: x-company
status: drafted
source: golden-set-bootstrap
content_type: insight
golden_candidate: true
media:
posted_url:
posted_at:
lesson:
media_cleared:
---

# Golden Set Candidate ${i + 1}

## Copy
${copy}
`;
      fs.mkdirSync(SOCIAL_QUEUE_DIR, { recursive: true });
      fs.writeFileSync(path.join(SOCIAL_QUEUE_DIR, `${draftId}.md`), content, 'utf8');
      created.push(draftId);
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error('Error generating golden-set candidates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
