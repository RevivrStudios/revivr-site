import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { PROBLEMS_DIR } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';

// Problem tickets: capture a problem's full context ONCE (symptoms, machine,
// app, logs), then thread every AI conversation and status change under it.
// Stored as markdown with YAML frontmatter so they are vault-compatible and
// human-editable.

const STATUSES = ['open', 'investigating', 'blocked', 'solved', 'archived'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fields: {}, body: content };
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fields, body: content.slice(match[0].length) };
}

function nextId(existing) {
  const max = existing
    .map((p) => parseInt((p.id || '').replace('PROB-', ''), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `PROB-${String(max + 1).padStart(3, '0')}`;
}

export async function listProblems() {
  await ensureDir(PROBLEMS_DIR);
  const files = (await readdir(PROBLEMS_DIR)).filter((f) => f.endsWith('.md'));
  const problems = [];
  for (const f of files) {
    try {
      const raw = await readFile(path.join(PROBLEMS_DIR, f), 'utf-8');
      const { fields, body } = parseFrontmatter(raw);
      problems.push({ filename: f, ...fields, body });
    } catch { /* skip unreadable */ }
  }
  return problems.sort((a, b) => ((a.updated || '') < (b.updated || '') ? 1 : -1));
}

export async function getProblem(id) {
  const all = await listProblems();
  return all.find((p) => p.id === id) || null;
}

export async function createProblem({ title, severity, project, body }) {
  await ensureDir(PROBLEMS_DIR);
  const existing = await listProblems();
  const id = nextId(existing);
  const now = new Date().toISOString().slice(0, 10);
  const sev = SEVERITIES.includes(severity) ? severity : 'medium';
  const content = `---
id: ${id}
title: ${title}
status: open
severity: ${sev}
project: ${project || ''}
created: ${now}
updated: ${now}
---
${body || ''}
`;
  const filename = `${id}.md`;
  await writeFile(path.join(PROBLEMS_DIR, filename), content, 'utf-8');
  return { id, filename, title, status: 'open', severity: sev, project: project || '', created: now, updated: now, body: body || '' };
}

export async function updateProblem(id, updates) {
  const problem = await getProblem(id);
  if (!problem) return null;
  const filePath = path.join(PROBLEMS_DIR, path.basename(problem.filename));
  const raw = await readFile(filePath, 'utf-8');
  const { fields, body } = parseFrontmatter(raw);

  if (updates.status && STATUSES.includes(updates.status)) fields.status = updates.status;
  if (updates.severity && SEVERITIES.includes(updates.severity)) fields.severity = updates.severity;
  if (updates.title) fields.title = updates.title;
  fields.updated = new Date().toISOString().slice(0, 10);

  const newBody = updates.appendNote
    ? `${body.trimEnd()}\n\n## Note (${fields.updated})\n${updates.appendNote}\n`
    : body;

  const fm = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
  await writeFile(filePath, `---\n${fm}\n---\n${newBody}`, 'utf-8');
  return { ...fields, body: newBody, filename: problem.filename };
}
