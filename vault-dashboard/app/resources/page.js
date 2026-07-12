'use client';

import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Plus, Trash2, AlertTriangle, Pencil } from 'lucide-react';

const TYPES = ['machine', 'drive', 'certificate', 'subscription', 'license', 'service', 'domain', 'other'];
const EMPTY = { name: '', type: 'machine', detail: '', expires: '', monthlyCost: '', notes: '' };

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    const res = await fetch('/api/resources').then((r) => r.json());
    if (res.success) setResources(res.resources);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.name.trim()) return;
    await fetch('/api/resources', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this resource?')) return;
    await fetch('/api/resources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  function edit(r) {
    setForm(r);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const attention = resources.filter((r) => r.expired || r.expiring)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const byType = TYPES.map((t) => [t, resources.filter((r) => r.type === t)]).filter(([, rs]) => rs.length);

  return (
    <div>
      <div className="page-header">
        <h1>Resources</h1>
        <p className="subtitle">Machines, drives, certificates, subscriptions — with expiry radar</p>
      </div>

      {attention.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--danger, #ff5c5c)' }}>
          <div className="card-label"><AlertTriangle size={15} /> Needs attention</div>
          {attention.map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.88rem', alignItems: 'baseline' }}>
              <span className="chat-tool-chip">{r.type}</span>
              <strong>{r.name}</strong>
              <span style={{ color: r.expired ? 'var(--danger, #ff5c5c)' : 'var(--warning, #ffb020)' }}>
                {r.expired ? `expired ${-r.daysLeft} days ago` : `expires in ${r.daysLeft} days`} ({r.expires})
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <button className="action-btn" onClick={() => { setForm(EMPTY); setShowForm(!showForm); }}><Plus size={14} /> Add resource</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input className="assistant-input" placeholder="Name (e.g. Mac Studio, Distribution cert)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="assistant-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input className="assistant-input" placeholder="Detail (serial, account, capacity…)" value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Expires <input className="assistant-input" type="date" value={form.expires}
                onChange={(e) => setForm({ ...form, expires: e.target.value })} />
            </label>
            <input className="assistant-input" placeholder="Monthly cost (optional)" value={form.monthlyCost}
              onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })} />
          </div>
          <textarea className="assistant-input" rows={2} placeholder="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div><button className="action-btn" onClick={save}>{form.id ? 'Update' : 'Save'}</button></div>
        </div>
      )}

      {resources.length === 0 && (
        <div className="card"><div className="card-subtitle">
          Nothing tracked yet. Good starters: each Mac, the Sureal Drive, Apple Developer membership renewal,
          distribution certificates & provisioning profiles, domain renewals, API subscriptions.
        </div></div>
      )}

      {byType.map(([type, rs]) => (
        <div key={type} style={{ marginBottom: '1.5rem' }}>
          <div className="section-title"><HardDrive size={16} className="icon" /> {type}s</div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {rs.map((r) => (
              <div key={r.id} className="card" style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong>{r.name}</strong>
                {r.detail && <span className="card-subtitle">{r.detail}</span>}
                {r.expires && (
                  <span className="chat-tool-chip" style={{ color: r.expired ? 'var(--danger, #ff5c5c)' : r.expiring ? 'var(--warning, #ffb020)' : undefined }}>
                    expires {r.expires}
                  </span>
                )}
                {r.monthlyCost && <span className="chat-tool-chip">{r.monthlyCost}/mo</span>}
                {r.notes && <span className="card-subtitle">{r.notes}</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                  <button className="assistant-thread-del" onClick={() => edit(r)}><Pencil size={13} /></button>
                  <button className="assistant-thread-del" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
