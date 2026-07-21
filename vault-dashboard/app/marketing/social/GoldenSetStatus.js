'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function GoldenSetStatus() {
  const [status, setStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    fetch(`/api/marketing/social/golden-set?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/social/golden-set/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate candidates.');
        return;
      }
      load();
    } catch (err) {
      setError(err.message || 'Failed to generate candidates.');
    } finally {
      setGenerating(false);
    }
  }

  if (!status || status.ready) return null;

  return (
    <div className="card empty-state" style={{ textAlign: 'left', marginBottom: '1.5rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
            Golden set needed — {status.count}/{status.minimum} approved company examples
          </strong>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Company posting stays blocked until this is anchored. Generate candidates below, then "Approve as Golden Example" in the queue.
          </div>
          {error && <div className="bet-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
        </div>
        <button className="action-btn" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate candidates'}
        </button>
      </div>
    </div>
  );
}
