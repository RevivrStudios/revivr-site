'use client';

export default function VaultStats({ linkDensity, growthHistory }) {
  if (!linkDensity) return null;

  const densityColor = linkDensity.avgLinksPerDoc >= 3 ? 'var(--accent-green)'
    : linkDensity.avgLinksPerDoc >= 1.5 ? 'var(--accent-amber)' : 'var(--accent-red)';

  const densityLabel = linkDensity.avgLinksPerDoc >= 3 ? 'Healthy'
    : linkDensity.avgLinksPerDoc >= 1.5 ? 'Moderate' : 'Fragmented';

  // Growth sparkline
  const spark = growthHistory && growthHistory.length > 1;
  const maxCount = spark ? Math.max(...growthHistory.map(g => g.fileCount)) : 0;
  const minCount = spark ? Math.min(...growthHistory.map(g => g.fileCount)) : 0;
  const range = maxCount - minCount || 1;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">📈</span> Vault Intelligence</div>
      <div className="grid-3">
        {/* Link Density */}
        <div className="card">
          <div className="card-label">Link Density</div>
          <div className="card-value" style={{ color: densityColor }}>
            {linkDensity.avgLinksPerDoc}
          </div>
          <div className="card-subtitle">avg links/doc · {densityLabel}</div>
          <div style={{
            marginTop: '0.5rem',
            height: '4px',
            borderRadius: '4px',
            background: 'hsla(240,10%,20%,0.5)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (linkDensity.avgLinksPerDoc / 5) * 100)}%`,
              height: '100%',
              background: densityColor,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Total Links */}
        <div className="card">
          <div className="card-label">Total Wikilinks</div>
          <div className="card-value metric-purple" style={{ color: 'var(--accent-purple)' }}>
            {linkDensity.totalLinks}
          </div>
          <div className="card-subtitle">connections across {linkDensity.totalFiles} files</div>
        </div>

        {/* Growth */}
        <div className="card">
          <div className="card-label">Vault Growth</div>
          {spark ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '50px', marginBottom: '0.5rem' }}>
                {growthHistory.slice(-14).map((entry, i) => {
                  const h = ((entry.fileCount - minCount) / range) * 40 + 10;
                  return (
                    <div
                      key={i}
                      title={`${entry.date}: ${entry.fileCount} files`}
                      style={{
                        flex: 1,
                        height: `${h}px`,
                        background: 'var(--accent-cyan)',
                        opacity: 0.4 + (i / 14) * 0.6,
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>
              <div className="card-subtitle">
                {growthHistory.length} day{growthHistory.length !== 1 ? 's' : ''} tracked · {maxCount} files peak
              </div>
            </div>
          ) : (
            <div>
              <div className="card-value metric-cyan">{linkDensity.totalFiles}</div>
              <div className="card-subtitle">Growth tracking started today</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
