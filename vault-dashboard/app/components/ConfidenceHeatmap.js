'use client';

export default function ConfidenceHeatmap({ data }) {
  if (!data || data.length === 0) return null;

  function getColor(score) {
    if (score >= 8) return 'hsl(145, 70%, 50%)';
    if (score >= 6) return 'hsl(85, 60%, 50%)';
    if (score >= 4) return 'hsl(45, 80%, 50%)';
    if (score >= 2) return 'hsl(20, 80%, 50%)';
    return 'hsl(0, 70%, 50%)';
  }

  function getLabel(score) {
    if (score >= 8) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  }

  const avg = (data.reduce((s, d) => s + d.score, 0) / data.length).toFixed(1);

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">🔥</span> Confidence Heatmap</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-label" style={{ margin: 0 }}>Document Confidence Scores</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Avg: <span style={{ fontWeight: 700, color: getColor(parseFloat(avg)) }}>{avg}/10</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {data.map((doc) => (
            <div
              key={doc.path}
              title={`${doc.name}: ${doc.score}/10 — ${doc.lastVerified || 'unverified'}`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                background: getColor(doc.score),
                opacity: 0.35 + (doc.score / 10) * 0.65,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'white',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'scale(1.2)'; e.target.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = String(0.35 + (doc.score / 10) * 0.65); }}
            >
              {doc.score}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'hsl(0, 70%, 50%)' }} /> 0-3 Low
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'hsl(45, 80%, 50%)' }} /> 4-5 Medium
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'hsl(85, 60%, 50%)' }} /> 6-7 Good
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'hsl(145, 70%, 50%)' }} /> 8-10 High
          </div>
        </div>

        {/* File list */}
        <div style={{ marginTop: '1rem', maxHeight: '160px', overflowY: 'auto' }}>
          {data.map((doc) => (
            <div className="status-row" key={doc.path}>
              <div>
                <span className="status-label">{doc.name.replace(/_/g, ' ')}</span>
                {doc.authorAI && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    by {doc.authorAI}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {doc.lastVerified && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
                    {doc.lastVerified}
                  </span>
                )}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: getColor(doc.score),
                  minWidth: '32px',
                  textAlign: 'right',
                }}>
                  {doc.score}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
