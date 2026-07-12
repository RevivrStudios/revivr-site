'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, MessageSquare } from 'lucide-react';

const STATUS_COLORS = {
  open: 'var(--danger, #ff5c5c)',
  investigating: 'var(--warning, #ffb020)',
  blocked: 'var(--magenta, #d05ce3)',
  solved: 'var(--success, #3ddc84)',
  archived: '#888',
};

export default function ProblemsPage() {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', severity: 'medium', project: '', body: '' });
  const [filter, setFilter] = useState('active');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/problems').then((r) => r.json());
    if (res.success) setProblems(res.problems);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function create() {
    if (!form.title.trim()) return;
    const res = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then((r) => r.json());
    if (res.success) {
      setForm({ title: '', severity: 'medium', project: '', body: '' });
      setShowForm(false);
      refresh();
    }
  }

  async function setStatus(id, status) {
    await fetch('/api/problems', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    refresh();
  }

  async function discussWithAssistant(problem) {
    // One thread per problem: the assistant loads the ticket body as context,
    // so the problem is explained exactly once — in the ticket.
    const res = await fetch('/api/assistant/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${problem.id}: ${problem.title}`,
        project: problem.project || null,
        problemId: problem.id,
      }),
    }).then((r) => r.json());
    if (res.success) router.push('/assistant');
  }

  const visible = problems.filter((p) =>
    filter === 'all' ? true : filter === 'active' ? !['solved', 'archived'].includes(p.status) : p.status === filter
  );

  return (
    <div>
      <div className="page-header">
        <h1>Problems</h1>
        <p className="subtitle">Capture a problem once — then solve it from here without re-explaining</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <button className="action-btn" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New Problem</button>
        {['active', 'solved', 'all'].map((f) => (
          <button
            key={f}
            className="action-btn"
            style={{ opacity: filter === f ? 1 : 0.5 }}
            onClick={() => setFilter(f)}
          >{f}</button>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.6rem' }}>
          <input className="assistant-input" placeholder="Title — what is broken or blocked?"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <select className="assistant-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="assistant-input" placeholder="Project (optional, e.g. PeriPal)"
              value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
          </div>
          <textarea className="assistant-input" rows={6}
            placeholder="Capture ALL context once: symptoms, machine, Xcode/SDK versions, exact error output, what you already tried…"
            value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div><button className="action-btn" onClick={create}>Create</button></div>
        </div>
      )}

      {visible.length === 0 && <div className="card"><div className="card-subtitle">No {filter} problems. 🎉</div></div>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {visible.map((p) => (
          <div key={p.id} className="card" style={{ borderLeft: `3px solid ${STATUS_COLORS[p.status] || '#888'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <AlertTriangle size={15} color={STATUS_COLORS[p.status]} />
              <strong>{p.id}</strong>
              <span>{p.title}</span>
              <span className="chat-tool-chip">{p.severity}</span>
              {p.project && <span className="chat-tool-chip">{p.project}</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select className="assistant-select" value={p.status} onChange={(e) => setStatus(p.id, e.target.value)}>
                  {['open', 'investigating', 'blocked', 'solved', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="action-btn" onClick={() => discussWithAssistant(p)}>
                  <MessageSquare size={13} /> Solve with Assistant
                </button>
              </span>
            </div>
            {p.body?.trim() && (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-dim, #aaa)', marginTop: '0.6rem', fontFamily: 'inherit' }}>
                {p.body.trim().slice(0, 600)}{p.body.trim().length > 600 ? '…' : ''}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
