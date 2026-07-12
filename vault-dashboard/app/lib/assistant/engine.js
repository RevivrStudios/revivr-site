import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, ASSISTANT_MODEL, PROJECT_REGISTRY_FILE } from '@/app/lib/config';
import { safeReadFile } from '@/app/lib/vaultFs';
import { logAction } from '@/app/lib/actionlog';
import { TOOL_DEFINITIONS, executeTool, parseProjectRegistry } from '@/app/lib/assistant/tools';
import { getProblem } from '@/app/lib/problems';

const MAX_ITERATIONS = 15;

// Stable identity first (cacheable), volatile context injected per-turn below.
const BASE_SYSTEM = `You are the Revivr Operations Assistant — the resident AI of the Revivr Studios operations dashboard.

Revivr Studios is a solo studio (founder: Einar Johnson) building visionOS / spatial-computing apps. Institutional memory lives in an Obsidian vault ("VisionAppDev") with a strict structure: Registries/Project_Registry.md (all apps), per-project state files under Projects/, an append-only Registries/Handoff_Log.md, Trackers/ (Known Failure Modes, SDK Drift), Modules/ (techniques, Agent Command Center), Reports/, and Incubator/ (experiments).

Your defining trait: the user should NEVER have to re-explain context. Before answering questions about an app, a bug, or past work, pull the context yourself with your tools (list_projects, get_project_context, search_vault, get_known_failures_and_drift). When debugging, always check Known Failure Modes first — many problems have been solved before.

Ways of working:
- Be direct and practical; this is an operations console, not a chat toy.
- When you solve something new and durable, offer to save_report so it enters the vault's long-term memory.
- If a vault file or registry is missing, say so plainly and suggest checking VAULT_PATH / iCloud sync rather than guessing.
- Never invent registry rows, file paths, or past decisions — read them.`;

function extractText(content) {
  return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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

export async function runAssistantTurn(thread, userMessage) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to .env.local on the dashboard host, then restart the service.');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const contextBlock = await buildContextBlock(thread);
  const system = [
    { type: 'text', text: BASE_SYSTEM, cache_control: { type: 'ephemeral' } },
    ...(contextBlock ? [{ type: 'text', text: `# Live operational context (auto-loaded)\n\n${contextBlock}` }] : []),
  ];

  const messages = [...thread.messages, { role: 'user', content: userMessage }];
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
