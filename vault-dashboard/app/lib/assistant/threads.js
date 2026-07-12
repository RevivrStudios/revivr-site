import { readFile, writeFile, readdir, unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { THREADS_DIR } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';

// Threads are the persistence layer that makes the assistant "already know":
// every conversation is stored in full (including tool_use/tool_result and
// thinking blocks) and can be resumed days later with its context intact.
// A thread may be bound to a project (app name) and/or a problem ticket.

function threadPath(id) {
  return path.join(THREADS_DIR, `${id}.json`);
}

export async function createThread({ title, project, problemId }) {
  await ensureDir(THREADS_DIR);
  const thread = {
    id: crypto.randomUUID(),
    title: title || 'New conversation',
    project: project || null,
    problemId: problemId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  await writeFile(threadPath(thread.id), JSON.stringify(thread, null, 2), 'utf-8');
  return thread;
}

export async function getThread(id) {
  try {
    return JSON.parse(await readFile(threadPath(path.basename(id)), 'utf-8'));
  } catch {
    return null;
  }
}

export async function saveThread(thread) {
  thread.updatedAt = new Date().toISOString();
  await ensureDir(THREADS_DIR);
  await writeFile(threadPath(thread.id), JSON.stringify(thread, null, 2), 'utf-8');
}

export async function listThreads() {
  await ensureDir(THREADS_DIR);
  const files = (await readdir(THREADS_DIR)).filter((f) => f.endsWith('.json'));
  const threads = [];
  for (const f of files) {
    try {
      const t = JSON.parse(await readFile(path.join(THREADS_DIR, f), 'utf-8'));
      threads.push({
        id: t.id, title: t.title, project: t.project, problemId: t.problemId,
        createdAt: t.createdAt, updatedAt: t.updatedAt,
        messageCount: t.messages.length,
      });
    } catch { /* skip corrupt files */ }
  }
  return threads.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function deleteThread(id) {
  try {
    await unlink(threadPath(path.basename(id)));
    return true;
  } catch {
    return false;
  }
}
