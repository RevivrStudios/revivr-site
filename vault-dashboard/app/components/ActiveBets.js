'use client';

import { useEffect, useState } from 'react';
import { Target, Pencil, Trash2, Plus, X, Check, ChevronRight } from 'lucide-react';
import DetailPanel from './DetailPanel';

const MAX_BETS = 3;
const SNIPPET_LEN = 80;

const BLANK_BET = {
  title: '',
  why_now: '',
  next_action: '',
  done_looks_like: '',
  owner_lane: '',
  repo: '',
  started: '',
};

const FLAGSHIP_SEED = {
  title: 'Stare&Share — gaze-dwell AAC flagship',
  why_now: 'Credibility spearhead for the three-network strategy (visionOS dev / Apple accessibility / ALS-AAC).',
  next_action: 'Commit the dirty working tree; decide UE-vs-native (Path B) in writing.',
  done_looks_like: 'A TestFlight build a Team Gleason contact can try.',
  owner_lane: 'Founder + Claude',
  repo: '/Volumes/Unreal Drive/AppleDeveloper/Xcode_Projects/Stare&Share',
  started: '',
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  const diffMs = Date.now() - then.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function snippet(text) {
  if (!text) return null;
  const t = text.trim();
  return t.length > SNIPPET_LEN ? `${t.slice(0, SNIPPET_LEN).trimEnd()}…` : t;
}

function BetField({ label, value, onChange, placeholder, multiline }) {
  return (
    <label className="bet-field">
      <span className="bet-field-label">{label}</span>
      {multiline ? (
        <textarea
          className="field-textarea"
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field-input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function BetEditor({ draft, onChange, onSave, onCancel, saving, error }) {
  const set = (key) => (val) => onChange({ ...draft, [key]: val });
  return (
    <div className="card bet-card bet-card-editing">
      <BetField label="Title" value={draft.title} placeholder="What is this bet?" onChange={set('title')} />
      <BetField label="Next action" value={draft.next_action} placeholder="The single next concrete step" onChange={set('next_action')} multiline />
      <BetField label="Done looks like" value={draft.done_looks_like} placeholder="How you'll know it's finished" onChange={set('done_looks_like')} />
      <BetField label="Why now" value={draft.why_now} placeholder="Why this, why this week" onChange={set('why_now')} />
      <div className="bet-field-row">
        <BetField label="Owner lane" value={draft.owner_lane} placeholder="e.g. Founder + Claude" onChange={set('owner_lane')} />
        <BetField label="Started" value={draft.started} placeholder="YYYY-MM-DD" onChange={set('started')} />
      </div>
      <BetField label="Repo (optional)" value={draft.repo} placeholder="/path/to/repo" onChange={set('repo')} />
      {error && <div className="bet-error">{error}</div>}
      <div className="bet-card-actions">
        <button className="action-btn bet-save" onClick={onSave} disabled={saving}>
          {saving ? <span className="spinner" /> : <Check size={16} />} Save
        </button>
        <button className="action-btn bet-cancel" onClick={onCancel} disabled={saving}>
          <X size={16} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function ActiveBets() {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [bets, setBets] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // number | 'new' | null
  const [draft, setDraft] = useState(BLANK_BET);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // index of bet open in the detail panel

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/now?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setExists(!!data.exists);
      setBets(data.bets || []);
    } catch (err) {
      console.error('Failed to load NOW.md:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function persist(nextBets) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/now', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: nextBets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save.');
        return false;
      }
      setExists(true);
      setBets(data.bets || []);
      setEditingIndex(null);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function startSeed() {
    setDraft({ ...FLAGSHIP_SEED, started: todayISO() });
    setEditingIndex('new');
    setError(null);
  }

  function startAdd() {
    setDraft({ ...BLANK_BET, started: todayISO() });
    setEditingIndex('new');
    setError(null);
  }

  function startEdit(i) {
    setDraft({ ...BLANK_BET, ...bets[i] });
    setEditingIndex(i);
    setSelected(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setError(null);
  }

  async function saveEdit() {
    if (!draft.title.trim()) {
      setError('A bet needs a title.');
      return;
    }
    const next = editingIndex === 'new' ? [...bets, draft] : bets.map((b, i) => (i === editingIndex ? draft : b));
    await persist(next);
  }

  async function removeBet(i) {
    const next = bets.filter((_, idx) => idx !== i);
    setSelected(null);
    await persist(next);
  }

  if (loading) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="section-title"><Target size={18} className="icon" /> Active Bets</div>
        <div className="bet-list">
          <div className="loading-shimmer" style={{ height: 64 }} />
          <div className="loading-shimmer" style={{ height: 64 }} />
        </div>
      </div>
    );
  }

  const activeBet = selected != null ? bets[selected] : null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-title"><Target size={18} className="icon" /> Active Bets</div>

      {!exists && editingIndex !== 'new' && (
        <div className="card empty-state" style={{ textAlign: 'left', padding: '1.75rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No active bets declared.
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            NOW.md doesn&apos;t exist yet. Max 3 bets, everything else is parked by definition.
          </div>
          <button className="action-btn" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} onClick={startSeed}>
            <Plus size={16} /> Declare bet #1 — Stare&amp;Share (flagship)
          </button>
        </div>
      )}

      {editingIndex === 'new' && (
        <div style={{ marginBottom: '1rem', maxWidth: 640 }}>
          <BetEditor draft={draft} onChange={setDraft} onSave={saveEdit} onCancel={cancelEdit} saving={saving} error={error} />
        </div>
      )}

      {(exists || bets.length > 0) && (
        <div className="bet-list">
          {bets.map((bet, i) =>
            editingIndex === i ? (
              <div key={i} style={{ maxWidth: 640 }}>
                <BetEditor draft={draft} onChange={setDraft} onSave={saveEdit} onCancel={cancelEdit} saving={saving} error={error} />
              </div>
            ) : (
              <button className="bet-row" key={i} onClick={() => setSelected(i)}>
                <span className="bet-row-num">{i + 1}</span>
                <span className="bet-row-main">
                  <span className="bet-row-title">{bet.title}</span>
                  <span className="bet-row-snippet">
                    {snippet(bet.next_action) || snippet(bet.done_looks_like) || 'No next action set — tap to add one.'}
                  </span>
                </span>
                {bet.started && <span className="bet-row-age">{daysSince(bet.started)}d</span>}
                <ChevronRight size={16} className="bet-row-chevron" />
              </button>
            )
          )}

          {exists && bets.length < MAX_BETS && editingIndex !== 'new' && (
            <button className="bet-add-row" onClick={startAdd}>
              <Plus size={16} /> <span className="bet-add-row-label">Add bet</span>
            </button>
          )}
        </div>
      )}

      {exists && bets.length >= MAX_BETS && editingIndex === null && (
        <div className="bet-cap-note">Kill or park something first — {MAX_BETS} is the cap, not a suggestion.</div>
      )}

      <DetailPanel
        open={activeBet != null}
        onClose={() => setSelected(null)}
        title={activeBet?.title}
        badge={activeBet ? `Bet ${selected + 1}${activeBet.started ? ` · ${daysSince(activeBet.started)}d old` : ''}` : null}
        tone="orange"
      >
        {activeBet && (
          <>
            {activeBet.next_action && (
              <>
                <div className="dp-section-label">Next action</div>
                <div className="dp-callout">{activeBet.next_action}</div>
              </>
            )}
            {activeBet.done_looks_like && (
              <>
                <div className="dp-section-label">Done looks like</div>
                <p className="dp-text">{activeBet.done_looks_like}</p>
              </>
            )}
            {activeBet.why_now && (
              <>
                <div className="dp-section-label">Why now</div>
                <p className="dp-muted">{activeBet.why_now}</p>
              </>
            )}
            <div className="dp-section-label">Details</div>
            {activeBet.owner_lane && (
              <div className="dp-kv"><span className="dp-kv-key">Owner</span><span className="dp-kv-val">{activeBet.owner_lane}</span></div>
            )}
            {activeBet.started && (
              <div className="dp-kv"><span className="dp-kv-key">Started</span><span className="dp-kv-val">{activeBet.started} ({daysSince(activeBet.started)}d ago)</span></div>
            )}
            {activeBet.repo && (
              <div className="dp-kv"><span className="dp-kv-key">Repo</span><span className="dp-kv-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{activeBet.repo}</span></div>
            )}
            <div className="bet-panel-actions">
              <button className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => startEdit(selected)}>
                <Pencil size={15} /> Edit
              </button>
              <button className="action-btn danger" style={{ width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => removeBet(selected)} disabled={saving}>
                <Trash2 size={15} /> Remove from NOW
              </button>
            </div>
          </>
        )}
      </DetailPanel>
    </div>
  );
}
