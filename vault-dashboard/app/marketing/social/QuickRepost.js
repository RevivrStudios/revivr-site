'use client';

import { useState } from 'react';
import { Repeat2, Search, Send } from 'lucide-react';

export default function QuickRepost({ onPosted }) {
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [account, setAccount] = useState('x-company');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [postedUrl, setPostedUrl] = useState(null);

  async function fetchPreview() {
    if (!url.trim()) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setPostedUrl(null);
    try {
      const res = await fetch(`/api/marketing/social/repost/preview?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not preview that URL.');
        return;
      }
      setPreview(data.preview);
    } catch (err) {
      setError(err.message || 'Could not preview that URL.');
    } finally {
      setPreviewing(false);
    }
  }

  async function post() {
    setPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/social/repost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), comment: comment.trim(), account }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to post.');
        return;
      }
      setPostedUrl(data.posted_url);
      setUrl('');
      setComment('');
      setPreview(null);
      onPosted?.();
    } catch (err) {
      setError(err.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-label"><Repeat2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Quick Repost / Link Share</div>

      <div className="bet-field-row">
        <label className="bet-field" style={{ flex: 2 }}>
          <span className="bet-field-label">Post URL (X post to repost, or any link — YouTube etc — to share)</span>
          <input className="field-input" placeholder="https://x.com/.../status/… or https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label className="bet-field">
          <span className="bet-field-label">Account</span>
          <select className="field-input" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="x-company">@RevivrStudios</option>
            <option value="x-personal">@EinarJohnson_XR</option>
          </select>
        </label>
      </div>

      <label className="bet-field">
        <span className="bet-field-label">Comment (optional — blank = plain repost for X posts, URL-only tweet for links)</span>
        <textarea className="field-textarea" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>

      {error && <div className="bet-error">{error}</div>}

      {!preview ? (
        <button className="action-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem' }} onClick={fetchPreview} disabled={previewing || !url.trim()}>
          <Search size={14} /> {previewing ? 'Loading…' : 'Preview'}
        </button>
      ) : (
        <>
          {preview.kind === 'link' ? (
            <>
              <div className="approval-meta" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
                <strong>{preview.site}</strong>{preview.author ? ` · ${preview.author}` : ''}
              </div>
              <div className="approval-draft-text">{preview.title}</div>
              <div className="approval-meta">Posts as: {comment.trim() ? 'your comment + link (X shows the preview card)' : 'the link alone'}</div>
            </>
          ) : (
            <>
              <div className="approval-meta" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
                <strong>@{preview.author?.username || 'unknown'}</strong> · {preview.metrics ? `${preview.metrics.like_count ?? 0} likes · ${preview.metrics.reply_count ?? 0} replies` : ''}
              </div>
              <div className="approval-draft-text">{preview.text}</div>
            </>
          )}
          <div className="approval-actions">
            <button className="action-btn approve" onClick={post} disabled={posting}>
              <Send size={16} /> {posting ? 'Posting…' : preview.kind === 'link' ? 'Share link' : comment.trim() ? 'Quote-post' : 'Repost'}
            </button>
            <button className="action-btn" onClick={() => setPreview(null)} disabled={posting}>
              Cancel
            </button>
          </div>
        </>
      )}

      {postedUrl && (
        <div className="approval-meta" style={{ marginTop: '0.6rem' }}>
          Posted: <a href={postedUrl} target="_blank" rel="noreferrer">{postedUrl}</a>
        </div>
      )}
    </div>
  );
}
