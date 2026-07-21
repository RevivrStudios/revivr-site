'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Check, X, RotateCcw, Layers, Clock } from 'lucide-react';
import MarketingTabs from '../MarketingTabs';
import QuellStatus from '../QuellStatus';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

const STALE_DAYS = 30; // May 2026 backlog is ~8 weeks old by the 2026-07-08 audit

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function ApprovalCard({ approval, onDecide, busy }) {
  const [note, setNote] = useState(approval.decisionNotes || '');
  const [captureAsLesson, setCaptureAsLesson] = useState(false);
  const [lessonSection, setLessonSection] = useState('Campaign Results');
  const [expanded, setExpanded] = useState(false);
  const age = daysSince(approval.created);
  const isPending = approval.status === 'needs-einar-review';

  const draft = approval.draftText || '';
  const isLong = draft.length > 400;
  const shownDraft = expanded || !isLong ? draft : draft.slice(0, 400) + '…';

  return (
    <div className="card approval-card">
      <div className="approval-card-header">
        <div>
          <div className="card-label">{approval.app_id || 'unknown app'} · {approval.item_type || 'item'}</div>
          <div className="approval-title">{approval.title}</div>
        </div>
        <span className={`status-badge ${approval.status === 'approved' ? 'online' : approval.status === 'needs-einar-review' ? 'warning' : 'offline'}`}>
          {approval.status}
        </span>
      </div>

      <div className="approval-meta">
        {approval.channel && <span>{approval.channel}</span>}
        {approval.created && <span><Clock size={12} /> {approval.created}{age !== null ? ` · ${age}d ago` : ''}</span>}
      </div>

      {approval.imagePath && approval.imageExists && (
        <img
          className="approval-image"
          src={`/api/marketing/approvals/image?file=${encodeURIComponent(approval.filename)}`}
          alt={approval.title}
          loading="lazy"
        />
      )}
      {approval.imagePath && !approval.imageExists && (
        <div className="approval-image-missing">
          Referenced asset is no longer on disk — likely cleaned up during the May 2026 iteration cycle.
        </div>
      )}

      {draft && (
        <div className="approval-draft-text">
          {shownDraft}
          {isLong && (
            <button className="approval-expand-btn" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {isPending ? (
        <>
          <textarea
            className="field-textarea"
            rows={2}
            placeholder="Decision note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="approval-lesson-toggle">
            <input type="checkbox" checked={captureAsLesson} onChange={(e) => setCaptureAsLesson(e.target.checked)} />
            Capture as a durable lesson
            {captureAsLesson && (
              <select value={lessonSection} onChange={(e) => setLessonSection(e.target.value)}>
                {['Positioning Lessons', 'Audience Insights', 'Channel Learnings', 'Campaign Results', 'Competitive Patterns'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </label>
          <div className="approval-actions">
            <button className="action-btn approve" disabled={busy} onClick={() => onDecide(approval, 'approved', note, captureAsLesson, lessonSection)}>
              <Check size={16} /> Approve
            </button>
            <button className="action-btn danger" disabled={busy} onClick={() => onDecide(approval, 'rejected', note, captureAsLesson, lessonSection)}>
              <X size={16} /> Reject
            </button>
            <button className="action-btn" disabled={busy} onClick={() => onDecide(approval, 'needs-changes', note, captureAsLesson, lessonSection)}>
              <RotateCcw size={16} /> Needs changes
            </button>
          </div>
        </>
      ) : (
        approval.decisionNotes && <div className="approval-decision-note">{approval.decisionNotes}</div>
      )}
    </div>
  );
}

export default function MarketingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyFile, setBusyFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/approvals?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(err.message || 'Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = useCallback(async (approval, status, decisionNote, captureAsLesson, lessonSection) => {
    setBusyFile(approval.filename);
    setError(null);
    try {
      const res = await fetch('/api/marketing/approvals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: approval.filename, status, decisionNote, captureAsLesson, lessonSection }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save decision.');
        return;
      }
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save decision.');
    } finally {
      setBusyFile(null);
    }
  }, [load]);

  const pending = approvals.filter((a) => a.status === 'needs-einar-review');
  const stalePending = pending.filter((a) => (daysSince(a.created) ?? 0) >= STALE_DAYS);

  const filtered = useMemo(() => {
    if (filter === 'pending') return pending;
    if (filter === 'rejected') return approvals.filter((a) => a.status === 'rejected');
    if (filter === 'approved') return approvals.filter((a) => a.status === 'approved');
    return approvals;
  }, [approvals, filter, pending]);

  async function bulkSupersedeStale() {
    if (!stalePending.length) return;
    setBulkBusy(true);
    setError(null);
    try {
      for (const a of stalePending) {
        await fetch('/api/marketing/approvals/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: a.filename,
            status: 'superseded',
            decisionNote: `Bulk-superseded during marketing merge — ${STALE_DAYS}+ days stale, iteration cycle abandoned per 2026-07-08 audit.`,
          }),
        });
      }
      await load();
    } catch (err) {
      setError(err.message || 'Bulk supersede failed partway through — reload to see what landed.');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><Megaphone size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Marketing Approvals</h1>
        <p className="subtitle">The approval queue is the whole bottleneck — decide here, from anywhere.</p>
      </div>

      <MarketingTabs />

      <div className="section-title" style={{ marginBottom: '1rem' }}>Status</div>
      <QuellStatus />

      <div className="section-title" style={{ marginTop: '0.5rem' }}>Approval Queue</div>

      {error && <div className="bet-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="tab-container">
        {FILTERS.map((f) => (
          <button key={f.key} className={`tab-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} {f.key === 'pending' ? `(${pending.length})` : ''}
          </button>
        ))}
      </div>

      {filter === 'pending' && stalePending.length > 0 && (
        <div className="card empty-state" style={{ textAlign: 'left', marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>{stalePending.length} pending records are {STALE_DAYS}+ days old</strong>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Known May 2026 backlog from an abandoned iteration cycle.</div>
            </div>
            <button className="action-btn" onClick={bulkSupersedeStale} disabled={bulkBusy}>
              <Layers size={16} /> {bulkBusy ? 'Superseding…' : `Mark ${stalePending.length} as superseded`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : filtered.length === 0 && filter === 'pending' && approvals.length > 0 ? (
        <div className="card empty-state" style={{ textAlign: 'left', padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Queue clear — nothing waiting on you.
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            All {approvals.length} submitted items have been triaged
            ({approvals.filter((a) => a.status === 'rejected').length} rejected · {approvals.filter((a) => a.status === 'approved').length} approved · {approvals.filter((a) => a.status === 'needs-changes').length} needs changes).
            {' '}<button className="approval-expand-btn" onClick={() => setFilter('all')} style={{ textDecoration: 'underline' }}>View the full history →</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">Nothing here.</div>
      ) : (
        <div className="approval-list">
          {filtered.map((a) => (
            <ApprovalCard key={a.filename} approval={a} onDecide={decide} busy={busyFile === a.filename} />
          ))}
        </div>
      )}
    </div>
  );
}
