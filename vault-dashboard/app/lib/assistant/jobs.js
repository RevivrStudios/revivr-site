import crypto from 'crypto';

// In-process store for async assistant turns (Option E, Stage 2.5). next-server
// is a single long-running process, so a module-level Map is a fine ephemeral
// store: a job only needs to survive from submit to the client's polls. This
// lets the chat request return immediately instead of blocking on a slow or
// queue-delayed Quinn turn — and carries the backend that answered, so the UI
// can show which brain replied (killing the silent Claude-fallback swap).
const jobs = new Map();
const TTL_MS = 10 * 60 * 1000; // keep finished jobs briefly so late polls still resolve

function sweep() {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if (j.doneAt && now - j.doneAt > TTL_MS) jobs.delete(id);
  }
}

export function createJob(threadId) {
  sweep();
  const id = crypto.randomUUID();
  jobs.set(id, { id, threadId, status: 'running', startedAt: Date.now(), doneAt: null });
  return id;
}

export function finishJob(id, result) {
  const j = jobs.get(id);
  if (j) Object.assign(j, { status: 'done', doneAt: Date.now(), ...result });
}

export function failJob(id, error) {
  const j = jobs.get(id);
  if (j) Object.assign(j, { status: 'error', doneAt: Date.now(), error: String(error?.message || error) });
}

export function getJob(id) {
  return jobs.get(id) || null;
}
