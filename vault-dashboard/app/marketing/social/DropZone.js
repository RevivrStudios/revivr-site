'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

const CONTENT_TYPES = ['wip', 'feedback-ask', 'testflight', 'launch', 'insight'];

export default function DropZone({ onDropped }) {
  const [apps, setApps] = useState([]);
  const [note, setNote] = useState('');
  const [app, setApp] = useState('');
  const [contentType, setContentType] = useState('wip');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastDrop, setLastDrop] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/marketing/apps')
      .then((r) => r.json())
      .then((d) => setApps(d.apps || []))
      .catch(() => {});
  }, []);

  const addFiles = useCallback((fileList) => {
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  async function submit() {
    if (!note.trim()) {
      setError('What is this? A short note is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('note', note.trim());
      form.set('app', app);
      form.set('content_type', contentType);
      files.forEach((f) => form.append('media', f));

      const res = await fetch('/api/marketing/social/drops', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save the drop.');
        return;
      }
      setLastDrop({ drop_id: data.drop_id, media: data.media });
      setNote('');
      setFiles([]);
      onDropped?.();
    } catch (err) {
      setError(err.message || 'Failed to save the drop.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-label">Drop a WIP</div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent-orange)' : 'var(--border-subtle)'}`,
          borderRadius: '8px',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginTop: '0.75rem',
          marginBottom: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <UploadCloud size={20} style={{ marginBottom: '0.35rem' }} />
        <div>Drag video/screenshots here, or click to browse.</div>
        {files.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {files.map((f) => f.name).join(', ')}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
      </div>

      <label className="bet-field">
        <span className="bet-field-label">What is this?</span>
        <textarea
          className="field-textarea"
          rows={2}
          placeholder="What just started working? Any ask (feedback / TestFlight interest)?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="bet-field-row">
        <label className="bet-field">
          <span className="bet-field-label">App (optional)</span>
          <select className="field-input" value={app} onChange={(e) => setApp(e.target.value)}>
            <option value="">— none —</option>
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>{a.title}</option>
            ))}
          </select>
        </label>
        <label className="bet-field">
          <span className="bet-field-label">Type</span>
          <select className="field-input" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="bet-error">{error}</div>}

      <button className="action-btn" style={{ marginTop: '0.5rem', width: 'auto', padding: '0.5rem 1.25rem' }} onClick={submit} disabled={submitting}>
        {submitting ? <span className="spinner" /> : <UploadCloud size={14} />} {submitting ? 'Saving…' : 'Drop it'}
      </button>

      {lastDrop && (
        <div className="approval-meta" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
          Saved as <code>{lastDrop.drop_id}</code>{lastDrop.media?.length ? ` with ${lastDrop.media.length} media file(s)` : ''}.
          {' '}Auto-drafting isn't wired yet (that's M3) — draft manually into <code>16 Social Queue/</code> using the template, or wait for the drop watcher.
        </div>
      )}
    </div>
  );
}
