import crypto from 'crypto';
import { runAssistantTurn } from '@/app/lib/assistant/engine';
import { logAction } from '@/app/lib/actionlog';

// "Ask Quinn to handle this" — turn a read-only red item on the dashboard into a
// one-click action. Each kind builds a focused prompt; the turn runs through the
// same engine as the assistant (so it uses Quinn's persona/memory + the vault
// tools, or the Claude fallback), on an EPHEMERAL thread that is never persisted.

const KINDS = {
  'health-check': {
    title: (c) => `Fix: ${c.name}`,
    prompt: (c) =>
      `One of the dashboard's automated ops health checks is failing.\n\n` +
      `Check: ${c.name}\nState: ${c.state}\nDetail: ${c.detail}\n` +
      (c.fixHint ? `Known remediation hint: ${c.fixHint}\n` : '') +
      `\nDiagnose the most likely cause and give me the precise, concrete next steps to fix it — command-level where you can. ` +
      `Check Known Failure Modes first (this may have happened before). Keep it tight and actionable; no preamble.`,
  },
  'app-review': {
    title: (c) => `Respond to review: ${c.appName || 'app'}`,
    prompt: (c) =>
      `A recent App Store review needs attention for ${c.appName || 'our app'}:\n\n` +
      `Rating: ${c.rating}/5\nTitle: ${c.title}\nReview: ${c.content}\n\n` +
      `Draft a short, human developer response (Apple lets us reply publicly), and separately list any concrete product/ASO follow-ups this review implies.`,
  },
  'renewal': {
    title: (c) => `Renewal: ${c.item}`,
    prompt: (c) =>
      `This renewal is expired or expiring: ${c.item} (${c.type}), identifier ${c.identifier || 'n/a'}, ` +
      `status ${c.expired ? `expired ${Math.abs(c.daysLeft)}d ago` : `${c.daysLeft}d left`}.\n\n` +
      `Explain exactly how to renew/regenerate this and what breaks if I don't, specific to this type. Steps only.`,
  },
  'generic': {
    title: (c) => c.title || 'Quinn action',
    prompt: (c) => c.prompt || String(c.text || ''),
  },
};

export function buildAction(kind, context = {}, intent) {
  const spec = KINDS[kind] || KINDS.generic;
  const base = spec.prompt(context);
  return {
    title: spec.title(context),
    message: intent ? `${base}\n\nExtra instruction: ${intent}` : base,
  };
}

export async function runQuinnAction({ kind, context, intent }) {
  const { title, message } = buildAction(kind, context, intent);
  const thread = {
    id: `action-${crypto.randomUUID()}`,
    title,
    project: context?.project || null,
    problemId: null,
    messages: [],
  };
  const result = await runAssistantTurn(thread, message);
  await logAction({
    source: 'quinn-action',
    action: kind,
    label: title,
    success: true,
    detail: `backend: ${result.backend || 'claude'}`,
  });
  return { text: result.replyText, backend: result.backend || 'claude', fallbackReason: result.fallbackReason || null };
}
