'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Plus } from 'lucide-react';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function QuellStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ date: '', channel: '', type: '', what: '', link: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/quell-status?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setErr(e.message || 'Failed to load Quell status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setDraft({ date: todayISO(), channel: '', type: '', what: '', link: '' });
    setShowAdd(true);
    setErr(null);
  }

  async function saveEntry() {
    if (!draft.what.trim()) {
      setErr('What was published is required.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/marketing/publish-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Failed to save.');
        return;
      }
      setShowAdd(false);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid-3">
        <div className="loading-shimmer" />
        <div className="loading-shimmer" />
        <div className="loading-shimmer" />
      </div>
    );
  }

  if (err && !status) {
    return <div className="bet-error">{err}</div>;
  }

  const { pendingApprovals, mostRecentDecision, mostRecentVaultChange, publishLog, radPortfolio, publishVocab } = status;
  const channelOptions = publishVocab?.channels || [];
  const typeOptions = publishVocab?.types || [];
  const radAge = radPortfolio?.mostRecentUpdate ? daysSince(radPortfolio.mostRecentUpdate.modifiedAt.slice(0, 10)) : null;
  const vaultAge = mostRecentVaultChange ? daysSince(mostRecentVaultChange.modifiedAt.slice(0, 10)) : null;
  const publishDanger = publishLog.daysSincePublish === null || publishLog.daysSincePublish > 7;

  return (
    <>
      <div className="grid-3">
        <div className="card">
          <div className="card-label">Marketing Status</div>
          <div className="card-value" style={{ color: pendingApprovals > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {pendingApprovals}
          </div>
          <div className="card-subtitle">
            pending approval{pendingApprovals === 1 ? '' : 's'} —{' '}
            <Link href="/marketing/approvals" style={{ color: 'var(--accent-orange)' }}>review queue</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-label">Recent Actions</div>
          {mostRecentDecision ? (
            <>
              <div className="app-card-status" style={{ marginTop: 0, textTransform: 'none' }}>
                {mostRecentDecision.status} · {mostRecentDecision.title}
              </div>
              <div className="approval-meta" style={{ marginTop: '0.5rem' }}>
                <span><Clock size={12} /> {formatDate(mostRecentDecision.decidedAt)}</span>
              </div>
            </>
          ) : (
            <div className="card-subtitle">No approval decisions yet.</div>
          )}
          {mostRecentVaultChange && (
            <div className="approval-meta" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <span>Last vault change: {mostRecentVaultChange.relativePath} · {vaultAge}d ago</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-label">Last Public Artifact</div>
          <div className="card-value" style={{ color: publishDanger ? 'var(--danger)' : 'var(--success)' }}>
            {publishLog.daysSincePublish === null ? 'Never' : `${publishLog.daysSincePublish}d`}
          </div>
          <div className="card-subtitle">
            {publishLog.lastEntry
              ? `${publishLog.lastEntry.what} (${publishLog.lastEntry.channel})`
              : 'Nothing logged as published yet.'}
          </div>
          {!showAdd ? (
            <button className="action-btn" style={{ marginTop: '0.85rem', width: 'auto', padding: '0.5rem 1rem' }} onClick={openAdd}>
              <Plus size={14} /> Log a publish
            </button>
          ) : (
            <div style={{ marginTop: '0.85rem' }}>
              <label className="bet-field">
                <span className="bet-field-label">Date</span>
                <input className="field-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <label className="bet-field">
                <span className="bet-field-label">What</span>
                <input className="field-input" placeholder="e.g. Stare&Share build-in-public post" value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} />
              </label>
              <label className="bet-field">
                <span className="bet-field-label">Channel</span>
                <select className="field-input" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}>
                  <option value="">Select a channel…</option>
                  {channelOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="bet-field">
                <span className="bet-field-label">Type</span>
                <select className="field-input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  <option value="">Select a type…</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="bet-field">
                <span className="bet-field-label">Link (optional)</span>
                <input className="field-input" placeholder="https://…" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
              </label>
              {err && <div className="bet-error">{err}</div>}
              <div className="bet-card-actions">
                <button className="action-btn bet-save" onClick={saveEntry} disabled={saving}>
                  {saving ? <span className="spinner" /> : <CheckCircle2 size={16} />} Save
                </button>
                <button className="action-btn bet-cancel" onClick={() => setShowAdd(false)} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div className="card-label">RAD Portfolio</div>
        {!radPortfolio?.exists ? (
          <div className="card-subtitle">No RAD projects found. <Link href="/rad" style={{ color: 'var(--accent-orange)' }}>Open RAD</Link>.</div>
        ) : (
          <>
            <div className="approval-meta" style={{ marginBottom: '0.75rem' }}>
              <span>Live from the vault · most recent update: {radPortfolio.mostRecentUpdate?.slug} · {radAge}d ago</span>
            </div>
            {radPortfolio.projects.map((p) => (
              <div className="status-row" key={p.slug}>
                <span className="status-label">{p.name}</span>
                <span className={`status-badge ${p.lifecycleStatus === 'Released' ? 'online' : 'warning'}`}>
                  {p.lifecycleStatus || 'unknown'}
                </span>
              </div>
            ))}
            <Link href="/rad" className="approval-expand-btn" style={{ display: 'inline-block', marginTop: '0.75rem' }}>
              Open RAD →
            </Link>
          </>
        )}
      </div>
    </>
  );
}
