import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { ANTHROPIC_API_KEY, ASSISTANT_MODEL, PROJECT_REGISTRY_FILE, RUNTIME_PERSONA_DIR, ASSISTANT_BACKEND } from '@/app/lib/config';
import { safeReadFile } from '@/app/lib/vaultFs';
import { logAction } from '@/app/lib/actionlog';
import { TOOL_DEFINITIONS, executeTool, parseProjectRegistry } from '@/app/lib/assistant/tools';
import { getProblem } from '@/app/lib/problems';
import { runQuinnTurn } from '@/app/lib/assistant/quinnRunner';

const MAX_ITERATIONS = 15;

// Stable identity first (cacheable), volatile context injected per-turn below.
// When Quinn's persona is available it is prepended as a "# Who you are" block
// (see loadQuinnPersona); this text then describes the dashboard surface/role.
const BASE_SYSTEM = `You are the resident assistant of the Revivr Studios operations dashboard.

Revivr Studios is a solo studio (founder: Einar Johnson) building visionOS / spatial-computing apps. Institutional memory lives in an Obsidian vault ("VisionAppDev") with a strict structure: Registries/Project_Registry.md (all apps), per-project state files under Projects/, an append-only Registries/Handoff_Log.md, Trackers/ (Known Failure Modes, SDK Drift), Modules/ (techniques, Agent Command Center), Reports/, and Incubator/ (experiments).

Your defining trait: the user should NEVER have to re-explain context. Before answering questions about an app, a bug, or past work, pull the context yourself with your tools (list_projects, get_project_context, search_vault, get_known_failures_and_drift). When debugging, always check Known Failure Modes first — many problems have been solved before.

Ways of working:
- Be direct and practical; this is an operations console, not a chat toy.
- You have persistent cross-session memory. Use quinn_memory_retrieve to recall people, past meetings, commitments, and prior decisions — retrieve BEFORE answering anything about the user's history or the people around them, never guess; this is memory the VisionAppDev vault tools do not hold. Use quinn_memory_append to record a genuinely durable new fact (a decision, a commitment, a person detail) so it persists — sparingly, and prefer confirming with the user before recording anything consequential.
- When you solve something new and durable, offer to save_report so it enters the vault's long-term memory.
- If a vault file or registry is missing, say so plainly and suggest checking VAULT_PATH / iCloud sync rather than guessing.
- Never invent registry rows, file paths, or past decisions — read them.`;

function extractText(content) {
  return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

// Build a user turn's content. With no images it stays a plain string (the
// existing shape); with images it becomes a text + image-block array that the
// Anthropic Messages API accepts natively and that also persists/replays in
// the thread. `images` is [{ media_type, data(base64) }].
function buildUserContent(userMessage, images) {
  if (!images || images.length === 0) return userMessage;
  const blocks = [];
  if (userMessage) blocks.push({ type: 'text', text: userMessage });
  for (const img of images) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
  }
  return blocks;
}

// Quinn's identity/persona, read once from the OpenClaw_Agent vault so the
// assistant reasons AS Quinn (persona + persistent memory) instead of a
// separate amnesiac brain. Cached at module scope; a service restart re-reads
// it. Returns null when the vault isn't synced on this host — the dashboard
// then falls back to the BASE_SYSTEM identity alone.
let _personaCache;
async function loadQuinnPersona() {
  if (_personaCache !== undefined) return _personaCache;
  const parts = [];
  for (const f of ['Quinn_Identity.md', 'Quinn_Soul.md', 'Quinn_User_Context.md']) {
    const text = await safeReadFile(path.join(RUNTIME_PERSONA_DIR, f));
    if (text) parts.push(text.trim());
  }
  _personaCache = parts.length ? parts.join('\n\n') : null;
  return _personaCache;
}

async function buildContextBlock(thread) {
  const parts = [];

  const registry = await safeReadFile(PROJECT_REGISTRY_FILE);
  if (registry) {
    const rows = parseProjectRegistry(registry);
    parts.push(`Current Project Registry (${rows.length} apps):\n` +
      rows.map((r) => `- ${r.appName} — stage: ${r.stage}`).join('\n'));
  }

  if (thread.project) {
    const ctx = await executeTool('get_project_context', { app_name: thread.project });
    parts.push(`This thread is bound to project "${thread.project}". Pre-loaded context:\n${ctx}`);
  }

  if (thread.problemId) {
    const problem = await getProblem(thread.problemId);
    if (problem) {
      parts.push(`This thread is attached to problem ticket ${problem.id} — "${problem.title}" (status: ${problem.status}, severity: ${problem.severity}).\nProblem description and captured context:\n${problem.body}`);
    }
  }

  return parts.join('\n\n---\n\n');
}

// The in-dashboard Anthropic (Claude) agent loop — the default backend, and the
// automatic fallback when the Quinn backend/gateway is unavailable.
async function runClaudeLoop(thread, userMessage, images) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to .env.local on the dashboard host, then restart the service.');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const contextBlock = await buildContextBlock(thread);
  const persona = await loadQuinnPersona();
  const system = [
    ...(persona ? [{ type: 'text', text: `# Who you are\n\n${persona}\n\nYou are currently operating through the Revivr Operations Dashboard — the console described next.`, cache_control: { type: 'ephemeral' } }] : []),
    { type: 'text', text: BASE_SYSTEM, cache_control: { type: 'ephemeral' } },
    ...(contextBlock ? [{ type: 'text', text: `# Live operational context (auto-loaded)\n\n${contextBlock}` }] : []),
  ];

  const messages = [...thread.messages, { role: 'user', content: buildUserContent(userMessage, images) }];
  const toolCalls = [];
  let response;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    if (response.stop_reason === 'refusal') {
      messages.push({ role: 'assistant', content: [{ type: 'text', text: '(request declined by safety systems)' }] });
      break;
    }

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') break;

    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    const results = [];
    for (const tu of toolUses) {
      let result;
      let isError = false;
      try {
        result = await executeTool(tu.name, tu.input);
      } catch (err) {
        result = `Tool error: ${err.message}`;
        isError = true;
      }
      toolCalls.push({ name: tu.name, input: tu.input, isError });
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: String(result), is_error: isError });
    }
    messages.push({ role: 'user', content: results });
  }

  const replyText = response ? extractText(response.content) : '';

  await logAction({
    source: 'assistant',
    action: 'chat-turn',
    label: `Assistant turn in "${thread.title}"`,
    success: true,
    detail: `tools used: ${toolCalls.map((t) => t.name).join(', ') || 'none'}`,
  });

  thread.messages = messages;
  if (thread.title === 'New conversation' && typeof userMessage === 'string') {
    thread.title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : '');
  }

  return { replyText, toolCalls, usage: response?.usage || null, stopReason: response?.stop_reason };
}

// Delegate a turn to the live OpenClaw Quinn agent (Option E, Stage 2). The
// dashboard thread maps to a stable openclaw session (dash-<threadId>), which
// becomes the transcript of record; thread.messages here keeps a display copy so
// the UI renders. Project/problem binding is passed inside the message, since a
// delegated turn runs in Quinn's own tool sandbox, not the dashboard's.
async function runQuinnBackend(thread, userMessage, images) {
  const contextBlock = await buildContextBlock(thread);
  // Quinn runs headless via the OpenClaw CLI, which is text-only — it can't
  // view attached images. Tell it plainly so it never bluffs about a
  // screenshot it can't see. The images still persist in the display copy.
  const imgNote = images?.length
    ? `\n\n[${images.length} image(s) were attached in the dashboard. This backend (Quinn via the OpenClaw CLI) cannot view images — answer from the text, or say you can't see them and suggest switching to the Claude backend.]`
    : '';
  const message = (contextBlock
    ? `# Live operational context (from the Revivr dashboard)\n\n${contextBlock}\n\n---\n\n${userMessage}`
    : userMessage) + imgNote;
  const sessionId = `dash-${thread.id}`;

  const replyText = await runQuinnTurn({ message, sessionId });

  thread.messages = [
    ...thread.messages,
    { role: 'user', content: buildUserContent(userMessage, images) },
    { role: 'assistant', content: [{ type: 'text', text: replyText }] },
  ];
  if (thread.title === 'New conversation' && typeof userMessage === 'string') {
    thread.title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : '');
  }
  await logAction({
    source: 'assistant',
    action: 'chat-turn',
    label: `Quinn turn in "${thread.title}"`,
    success: true,
    detail: `backend: quinn (session ${sessionId})`,
  });
  return { replyText, toolCalls: [], usage: null, stopReason: 'end_turn', backend: 'quinn' };
}

// Public entry point. Dispatches to the configured backend; when 'quinn' is
// selected but the gateway is unreachable, falls back to the Claude loop so the
// dashboard chat never hard-depends on the OpenClaw daemon.
export async function runAssistantTurn(thread, userMessage, images) {
  if (ASSISTANT_BACKEND === 'quinn') {
    try {
      return await runQuinnBackend(thread, userMessage, images);
    } catch (err) {
      console.error('Quinn backend unavailable, falling back to Claude loop:', err.message);
      const result = await runClaudeLoop(thread, userMessage, images);
      return { ...result, backend: 'claude-fallback', fallbackReason: err.message };
    }
  }
  return { ...(await runClaudeLoop(thread, userMessage, images)), backend: 'claude' };
}
