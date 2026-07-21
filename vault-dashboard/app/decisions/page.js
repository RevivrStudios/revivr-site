'use client';

import { useEffect, useState } from 'react';
import { BookMarked, Search, RefreshCw, Plus, X, Check } from 'lucide-react';

const BLANK_FORM = { decision: '', why: '', source: '', date: '' };

export default function DecisionIndex() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/decisions?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setDecisions(data.decisions || []);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function extract() {
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Extraction failed.');
        return;
      }
      setExtractResult(data);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function submitAdd() {
    if (!form.decision.trim()) {
      setError('A decision needs its own text.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save.');
        return;
      }
      setForm(BLANK_FORM);
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = decisions.filter((d) => {
    if (!normalizedQuery) return true;
    return [d.date, d.decision, d.why, d.source].some((v) => String(v || '').toLowerCase().includes(normalizedQuery));
  });

  return (
    <div>
      <div className="page-header">
        <h1>Decision Index</h1>
        <p className="subtitle">
          Queryable, not trapped in chat history — extracted from Handoff_Log&apos;s Key Decisions sections.
        </p>
      </div>

      {error && <div className="bet-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="action-btn" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={extract} disabled={extracting}>
          {extracting ? <span className="spinner" /> : <RefreshCw size={16} />} Extract from Handoff_Log
        </button>
        <button
          className="action-btn"
          style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? <X size={16} /> : <Plus size={16} />} {showAdd ? 'Cancel' : 'Add Decision'}
        </button>
        {extractResult && (
          <span style={{ fontSize: '0.8rem', color: extractResult.added > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
            {extractResult.added > 0
              ? `+${extractResult.added} new decision${extractResult.added === 1 ? '' : 's'} added.`
              : 'Already up to date — nothing new found.'}
          </span>
        )}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div className="bet-field">
            <span className="bet-field-label">Decision</span>
            <textarea
              className="field-textarea"
              rows={2}
              value={form.decision}
              placeholder="What was decided"
              onChange={(e) => setForm({ ...form, decision: e.target.value })}
            />
          </div>
          <div className="bet-field">
            <span className="bet-field-label">Why</span>
            <textarea
              className="field-textarea"
              rows={2}
              value={form.why}
              placeholder="Why (optional)"
              onChange={(e) => setForm({ ...form, why: e.target.value })}
            />
          </div>
          <div className="bet-field-row">
            <label className="bet-field">
              <span className="bet-field-label">Source</span>
              <input
                className="field-input"
                type="text"
                value={form.source}
                placeholder="e.g. Strategy session 2026-07-08"
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </label>
            <label className="bet-field">
              <span className="bet-field-label">Date</span>
              <input
                className="field-input"
                type="text"
                value={form.date}
                placeholder="YYYY-MM-DD (defaults to today)"
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
          </div>
          <button className="action-btn bet-save" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={submitAdd} disabled={saving}>
            {saving ? <span className="spinner" /> : <Check size={16} />} Save Decision
          </button>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.6rem', maxWidth: '420px',
        padding: '0 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)', marginBottom: '1.5rem',
      }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decisions, reasons, sources…"
          style={{ width: '100%', border: 0, outline: 0, background: 'transparent', color: 'var(--text-primary)', font: 'inherit', fontWeight: 700 }}
        />
      </div>

      {loading ? (
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          {decisions.length === 0
            ? 'No decisions indexed yet — click "Extract from Handoff_Log" to backfill from history.'
            : 'No decisions match that search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((d, i) => (
            <div className="card" key={`${d.date}-${i}`} style={{ padding: '1.1rem 1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.date}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.source}</div>
              </div>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.5, marginBottom: d.why ? '0.4rem' : 0 }}>
                {d.decision}
              </div>
              {d.why && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <BookMarked size={12} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
                  {d.why}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
