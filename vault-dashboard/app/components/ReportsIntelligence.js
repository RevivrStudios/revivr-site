'use client';

import { useState, useEffect } from 'react';

export default function ReportsIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vault/reports')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-label">📝 Reports Intelligence</div>
        <div className="loading-shimmer" style={{ height: '120px', marginTop: '1rem', borderRadius: '8px' }} />
      </div>
    );
  }

  const reports = data?.reports || [];

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="section-title">
        <span className="icon">📝</span> Session Intelligence Archive
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-label" style={{ margin: 0 }}>Vault Reports</div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'hsl(280, 60%, 65%)',
            background: 'hsla(280, 60%, 50%, 0.15)',
            border: '1px solid hsla(280, 60%, 50%, 0.25)',
            borderRadius: '20px',
            padding: '0.25rem 0.75rem',
          }}>
            {reports.length} saved {reports.length === 1 ? 'report' : 'reports'}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="empty-state">
            No reports saved yet. Use Prompt V1 from the Agent Command Center to save a session.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {reports.map((report) => (
              <div key={report.filename} style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr auto',
                alignItems: 'start',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'hsla(240, 20%, 100%, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'hsla(240, 20%, 100%, 0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'hsla(240, 20%, 100%, 0.03)'}
              >
                {/* Date */}
                <div style={{
                  fontSize: '0.7rem',
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: 'var(--text-muted)',
                  paddingTop: '2px',
                }}>
                  {report.created}
                </div>

                {/* Title + topic */}
                <div>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.2rem',
                  }}>
                    {report.title}
                  </div>
                  {report.topic && (
                    <div style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}>
                      {report.topic}
                    </div>
                  )}
                </div>

                {/* Links badge */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'hsl(200, 70%, 60%)',
                  background: 'hsla(200, 70%, 50%, 0.12)',
                  border: '1px solid hsla(200, 70%, 50%, 0.2)',
                  borderRadius: '12px',
                  padding: '0.2rem 0.55rem',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                }}>
                  🔗 {report.wikiLinks}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}>
          Reports archive at <code style={{ color: 'hsl(280, 60%, 65%)' }}>VisionAppDev/Reports/</code> — use <strong>Prompt V1</strong> (Agent Command Center) to save new sessions
        </div>
      </div>
    </div>
  );
}
