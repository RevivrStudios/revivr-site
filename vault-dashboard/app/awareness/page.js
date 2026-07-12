'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radar, RefreshCw, ExternalLink, FileText } from 'lucide-react';

const CATEGORIES = ['all', 'apple', 'ai', 'healthcare', 'robotics'];

export default function AwarenessPage() {
  const [data, setData] = useState(null);
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('briefing');

  const load = useCallback(async () => {
    const res = await fetch('/api/awareness').then((r) => r.json());
    if (res.success) setData(res);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    setStatus('Fetching feeds…');
    try {
      const res = await fetch('/api/awareness/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing: true }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error);
      setStatus(
        `Fetched ${res.fetched} items.` +
        (res.briefing ? ` Briefing: ${res.briefing}.` : '') +
        (res.briefingError ? ` Briefing skipped: ${res.briefingError}` : '')
      );
      await load();
    } catch (err) {
      setStatus(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  const items = (data?.items || []).filter((i) => category === 'all' || i.category === category);

  return (
    <div>
      <div className="page-header">
        <h1>Awareness</h1>
        <p className="subtitle">AI · healthcare · robotics · Apple ecosystem — distilled into briefings, archived to the vault</p>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="action-btn" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'pulse' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
        <button className="action-btn" style={{ opacity: view === 'briefing' ? 1 : 0.5 }} onClick={() => setView('briefing')}>
          <FileText size={13} /> Briefing
        </button>
        <button className="action-btn" style={{ opacity: view === 'feed' ? 1 : 0.5 }} onClick={() => setView('feed')}>
          <Radar size={13} /> Raw feed
        </button>
        {data?.fetchedAt && <span className="card-subtitle">Last fetch: {new Date(data.fetchedAt).toLocaleString()}</span>}
        {status && <span className="card-subtitle">{status}</span>}
      </div>

      {view === 'briefing' && (
        <div className="card">
          {data?.latestBriefing ? (
            <>
              <div className="card-label"><FileText size={15} /> {data.latestBriefing.filename}</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.92rem', lineHeight: 1.6 }}>
                {data.latestBriefing.content}
              </pre>
            </>
          ) : (
            <div className="card-subtitle">
              No briefing yet. Hit “Refresh now” — feeds are fetched immediately, and a briefing is distilled when
              ANTHROPIC_API_KEY is configured. Schedule scripts/awareness-refresh.sh for a daily briefing.
            </div>
          )}
        </div>
      )}

      {view === 'feed' && (
        <>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
            {CATEGORIES.map((c) => (
              <button key={c} className="action-btn" style={{ opacity: category === c ? 1 : 0.5 }} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          {items.length === 0 && <div className="card"><div className="card-subtitle">No items fetched yet.</div></div>}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {items.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noreferrer" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="chat-tool-chip">{item.category}</span>
                  <strong style={{ fontSize: '0.92rem' }}>{item.title}</strong>
                  <ExternalLink size={12} style={{ opacity: 0.5 }} />
                </div>
                <div className="card-subtitle" style={{ marginTop: '0.3rem' }}>
                  {item.feedName}{item.published ? ` · ${item.published}` : ''}
                </div>
                {item.summary && <div style={{ fontSize: '0.84rem', opacity: 0.75, marginTop: '0.3rem' }}>{item.summary}</div>}
              </a>
            ))}
          </div>
          {data?.errors?.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-label">Feed errors</div>
              {data.errors.map((e, i) => <div key={i} className="card-subtitle">{e.feed}: {e.error}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
