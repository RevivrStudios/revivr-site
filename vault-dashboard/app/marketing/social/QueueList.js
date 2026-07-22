'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Copy, Pencil, X, Check, Sparkles, Share2 } from 'lucide-react';

const FILTERS = [
  { key: 'drafted', label: 'Drafted' },
  { key: 'approved', label: 'Approved' },
  { key: 'posted', label: 'Posted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function QueueCard({ draft, busy, onApprove, onPostNow, onCopyConfirm, onEdit, onReject, onApproveGolden, onCrossPost }) {
  const [editing, setEditing] = useState(false);
  const [copyText, setCopyText] = useState(draft.copy);
  const [rejecting, setRejecting] = useState(false);
  const [lesson, setLesson] = useState('');
  const [confirmingCopy, setConfirmingCopy] = useState(false);
  const [postedUrl, setPostedUrl] = useState('');

  const isDrafted = draft.status === 'drafted' || draft.status === 'approved';

  return (
    <div className="card approval-card">
      <div className="approval-card-header">
        <div>
          <div className="card-label">{draft.platform || 'unknown platform'} · {draft.content_type || 'untyped'}</div>
          <div className="approval-title">
            {draft.source && draft.title.includes(draft.source) ? (
              <>
                {draft.title.slice(0, draft.title.indexOf(draft.source))}
                <a
                  href={draft.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="approval-source-link"
                  title="Open source post in a new tab"
                >
                  {draft.source}
                </a>
                {draft.title.slice(draft.title.indexOf(draft.source) + draft.source.length)}
              </>
            ) : (
              <>
                {draft.title}
                {draft.source && (
                  <>
                    {' '}
                    <a
                      href={draft.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="approval-source-link"
                      title="Open source post in a new tab"
                    >
                      source ↗
                    </a>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <span className={`status-badge ${draft.status === 'posted' ? 'online' : draft.status === 'rejected' ? 'offline' : 'warning'}`}>
          {draft.status}
        </span>
      </div>

      {draft.media && (
        <div className="approval-meta">Media: {draft.media} (attach manually — auto-attach not wired yet)</div>
      )}

      {draft.status === 'approved' && (
        <div className="approval-meta">
          Queued — auto-posts spaced apart (oldest first, ~1h gap, 8am–9pm). Use Post now to skip the wait.
        </div>
      )}

      {editing ? (
        <textarea className="field-textarea" rows={4} value={copyText} onChange={(e) => setCopyText(e.target.value)} />
      ) : (
        <div className="approval-draft-text">{draft.copy}</div>
      )}

      {draft.status === 'rejected' && draft.lesson && (
        <div className="approval-decision-note">Lesson: {draft.lesson}</div>
      )}
      {draft.status === 'posted' && draft.posted_url && (
        <div className="approval-meta">
          <a href={draft.posted_url} target="_blank" rel="noreferrer">{draft.posted_url}</a>
        </div>
      )}

      {isDrafted && (
        <div className="approval-actions" style={{ flexWrap: 'wrap' }}>
          {editing ? (
            <>
              <button className="action-btn approve" disabled={busy} onClick={() => { onEdit(draft, copyText); setEditing(false); }}>
                <Check size={16} /> Save edit
              </button>
              <button className="action-btn" disabled={busy} onClick={() => { setCopyText(draft.copy); setEditing(false); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {draft.canApprovePost && draft.status === 'approved' ? (
                <button className="action-btn approve" disabled={busy} onClick={() => onPostNow(draft)}>
                  <Send size={16} /> Post now
                </button>
              ) : draft.canApprovePost ? (
                <button className="action-btn approve" disabled={busy} onClick={() => onApprove(draft)}>
                  <Send size={16} /> Approve
                </button>
              ) : (
                <button
                  className="action-btn"
                  disabled={busy}
                  onClick={() => {
                    navigator.clipboard?.writeText(draft.copy);
                    setConfirmingCopy(true);
                  }}
                >
                  <Copy size={16} /> Copy
                </button>
              )}
              <button className="action-btn" disabled={busy} onClick={() => setEditing(true)}>
                <Pencil size={16} /> Edit
              </button>
              <button className="action-btn danger" disabled={busy} onClick={() => setRejecting((r) => !r)}>
                <X size={16} /> Reject
              </button>
              {draft.platform !== 'linkedin' && draft.content_type !== 'repost-comment' && (
                <button className="action-btn" disabled={busy} title="Create a LinkedIn sibling draft with its own copy and approval" onClick={() => onCrossPost(draft, 'linkedin')}>
                  <Share2 size={16} /> Cross-post → LinkedIn
                </button>
              )}
              {draft.platform === 'linkedin' && (
                <button className="action-btn" disabled={busy} title="Create an X (personal) sibling draft with its own copy and approval" onClick={() => onCrossPost(draft, 'x-personal')}>
                  <Share2 size={16} /> Cross-post → X
                </button>
              )}
              {draft.platform === 'x-company' && (
                <button className="action-btn approve" disabled={busy} onClick={() => onApproveGolden(draft)}>
                  <Sparkles size={16} /> Approve as Golden Example
                </button>
              )}
            </>
          )}
        </div>
      )}

      {confirmingCopy && (
        <div className="approval-meta" style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>Posted?</span>
          <input
            className="field-input"
            placeholder="posted URL (optional)"
            value={postedUrl}
            onChange={(e) => setPostedUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="action-btn approve" disabled={busy} onClick={() => { onCopyConfirm(draft, postedUrl); setConfirmingCopy(false); }}>
            Confirm
          </button>
        </div>
      )}

      {rejecting && (
        <div className="approval-meta" style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="field-input"
            placeholder="One-line lesson (required)"
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="action-btn danger"
            disabled={busy || !lesson.trim()}
            onClick={() => { onReject(draft, lesson); setRejecting(false); setLesson(''); }}
          >
            Confirm reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function QueueList() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('drafted');
  const [busyFile, setBusyFile] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/social/queue?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err.message || 'Failed to load the queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(filename, url, body) {
    setBusyFile(filename);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Action failed.');
        return;
      }
      await load();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusyFile(null);
    }
  }

  const onApprove = (draft) => run(draft.filename, '/api/marketing/social/queue/approve', { filename: draft.filename });
  const onPostNow = (draft) => run(draft.filename, '/api/marketing/social/queue/approve', { filename: draft.filename, mode: 'now' });
  const onCrossPost = (draft, platform) => run(draft.filename, '/api/marketing/social/queue/duplicate', { filename: draft.filename, platform });
  const onCopyConfirm = (draft, postedUrl) => run(draft.filename, '/api/marketing/social/queue/mark-posted', { filename: draft.filename, posted_url: postedUrl });
  const onEdit = (draft, copy) => run(draft.filename, '/api/marketing/social/queue/edit', { filename: draft.filename, copy });
  const onReject = (draft, lesson) => run(draft.filename, '/api/marketing/social/queue/reject', { filename: draft.filename, lesson });
  const onApproveGolden = (draft) => run(draft.filename, '/api/marketing/social/queue/approve-golden', { filename: draft.filename });

  const filtered = useMemo(() => {
    if (filter === 'drafted') return drafts.filter((d) => d.status === 'drafted');
    if (filter === 'approved') return drafts.filter((d) => d.status === 'approved');
    if (filter === 'posted') return drafts.filter((d) => d.status === 'posted');
    if (filter === 'rejected') return drafts.filter((d) => d.status === 'rejected');
    return drafts;
  }, [drafts, filter]);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="card-label" style={{ marginBottom: '0.5rem' }}>Queue</div>
      {error && <div className="bet-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="tab-container">
        {FILTERS.map((f) => (
          <button key={f.key} className={`tab-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">Nothing here yet.</div>
      ) : (
        <div className="approval-list">
          {filtered.map((d) => (
            <QueueCard
              key={d.filename}
              draft={d}
              busy={busyFile === d.filename}
              onApprove={onApprove}
              onPostNow={onPostNow}
              onCrossPost={onCrossPost}
              onCopyConfirm={onCopyConfirm}
              onEdit={onEdit}
              onReject={onReject}
              onApproveGolden={onApproveGolden}
            />
          ))}
        </div>
      )}
    </div>
  );
}
