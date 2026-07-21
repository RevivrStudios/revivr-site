import { execFile } from 'child_process';
import { promisify } from 'util';
import { OPENCLAW_BIN, QUINN_AGENT_ID, QUINN_THINKING } from '@/app/lib/config';

const execFileAsync = promisify(execFile);

// Option E, Stage 1 — run ONE real Quinn reasoning turn through the OpenClaw
// runtime: the same headless call the cron scripts use,
//   openclaw agent --agent quinn --message <msg> --session-id <id> --json
// dispatched to the running gateway (ws://127.0.0.1:18789). Returns the reply
// text. Throws on infrastructure failure (gateway down, non-zero exit, non-ok
// status, unparseable/empty output) so the caller can fall back to the
// in-dashboard Claude loop. This is delegation, not a second brain: the model
// (gpt-5.5/Codex), persona, memory, and tools are Quinn's own.
export async function runQuinnTurn({ message, sessionId, thinking = QUINN_THINKING, timeoutMs = 280000 }) {
  if (!message || !sessionId) throw new Error('runQuinnTurn requires message and sessionId');

  const args = [
    'agent',
    '--agent', QUINN_AGENT_ID,
    '--message', message,
    '--session-id', sessionId,
    '--thinking', thinking,
    '--json',
  ];

  let stdout;
  try {
    ({ stdout } = await execFileAsync(OPENCLAW_BIN, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }));
  } catch (err) {
    throw new Error(`openclaw agent failed (gateway up?): ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error('openclaw agent returned non-JSON output');
  }
  if (data.status && data.status !== 'ok') {
    throw new Error(`openclaw agent status: ${data.status}`);
  }

  const payloads = data?.result?.payloads || [];
  const text = payloads.map((p) => p?.text || '').filter(Boolean).join('\n').trim();
  if (!text) throw new Error('openclaw agent returned an empty reply');
  return text;
}
