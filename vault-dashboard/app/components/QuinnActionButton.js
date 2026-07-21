'use client';

import { useState, useRef } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import DetailPanel from './DetailPanel';

// One-click "Ask Quinn to handle this" — fires a background action turn and
// streams the result into the shared DetailPanel. Reusable across red items
// (health checks, reviews, renewals) via {kind, context, intent}.
export default function QuinnActionButton({ kind, context, intent, label = 'Ask Quinn', tone = 'amber' }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [reply, setReply] = useState('');
  const [backend, setBackend] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  async function start(e) {
    e?.stopPropagation();
    e?.preventDefault();
    setOpen(true);
    setStatus('running');
    setReply(''); setError(null); setBackend(null);
    try {
      const submit = await fetch('/api/actions/quinn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, context, intent }),
      }).then((r) => r.json());
      if (!submit.success) throw new Error(submit.error || 'could not start');

      const started = Date.now();
      const poll = async () => {
        const st = await fetch(`/api/actions/quinn/status?jobId=${encodeURIComponent(submit.jobId)}`).then((r) => r.json());
        if (st.status === 'done') { setReply(st.reply || '(no response)'); setBackend({ backend: st.backend, fallbackReason: st.fallbackReason }); setStatus('done'); return; }
        if (st.status === 'error') { setError(st.error || 'the action failed'); setStatus('error'); return; }
        if (Date.now() - started > 300000) { setError('timed out'); setStatus('error'); return; }
        pollRef.current = setTimeout(poll, 1300);
      };
      poll();
    } catch (err) {
      setError(err.message); setStatus('error');
    }
  }

  function close() {
    clearTimeout(pollRef.current);
    setOpen(false);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(reply); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  return (
    <>
      <button className="quinn-action-btn" onClick={start} title="Ask Quinn to handle this">
        <Sparkles size={13} /> {label}
      </button>
      <DetailPanel open={open} onClose={close} title={label} badge="Quinn" tone={tone}>
        {status === 'running' && (
          <div className="qa-working"><span className="spinner" /> Quinn is investigating — checking the vault, known failure modes, and context…</div>
        )}
        {status === 'error' && <div className="bv-card-error">{error}</div>}
        {status === 'done' && (
          <>
            {backend?.backend === 'claude-fallback' && (
              <div className="chat-backend-badge warn" style={{ marginBottom: '0.6rem' }}>
                ⚠ Quinn was unavailable — answered by the dashboard’s Claude assistant{backend.fallbackReason ? ` (${backend.fallbackReason})` : ''}.
              </div>
            )}
            <div className="qa-reply">{reply}</div>
            <button className="quinn-action-btn qa-copy" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        )}
      </DetailPanel>
    </>
  );
}
