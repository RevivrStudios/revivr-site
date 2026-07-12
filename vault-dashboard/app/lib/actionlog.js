import { appendFile } from 'fs/promises';
import path from 'path';
import { ACTION_LOG_FILE } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';
import { readFile } from 'fs/promises';

// Append-only operations audit log (JSONL). Every consequential dashboard
// action — shell executes, assistant tool calls, exports, feed refreshes —
// lands here so the Quinn page can show a truthful "Recent Actions" feed.

export async function logAction(entry) {
  try {
    await ensureDir(path.dirname(ACTION_LOG_FILE));
    const record = { timestamp: new Date().toISOString(), ...entry };
    await appendFile(ACTION_LOG_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err) {
    // Logging must never break the action it records.
    console.warn('[ActionLog] write failed:', err.message);
  }
}

export async function readActions(limit = 100) {
  try {
    const raw = await readFile(ACTION_LOG_FILE, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .reverse();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
