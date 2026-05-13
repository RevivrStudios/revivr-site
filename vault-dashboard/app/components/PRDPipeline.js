'use client';

const STAGE_CONFIG = {
  draft: { emoji: '📝', color: 'var(--accent-amber)', label: 'Draft' },
  'in-progress': { emoji: '🔨', color: 'var(--accent-blue)', label: 'In Progress' },
  active: { emoji: '✅', color: 'var(--accent-green)', label: 'Active' },
  shipped: { emoji: '🚀', color: 'var(--accent-purple)', label: 'Shipped' },
  archived: { emoji: '📦', color: 'var(--text-muted)', label: 'Archived' },
};

export default function PRDPipeline({ data }) {
  if (!data) return null;

  const stages = Object.entries(data).filter(([, items]) => items.length > 0);
  const total = Object.values(data).reduce((sum, items) => sum + items.length, 0);

  if (total === 0) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">🎯</span> Document Lifecycle Pipeline</div>

      {/* Pipeline bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', height: '32px', background: 'hsla(240,10%,15%,0.5)' }}>
          {stages.map(([stage, items]) => {
            const config = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
            const pct = (items.length / total) * 100;
            return (
              <div
                key={stage}
                title={`${config.label}: ${items.length}`}
                style={{
                  width: `${pct}%`,
                  background: config.color,
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#fff',
                  minWidth: items.length > 0 ? '40px' : '0',
                  transition: 'width 0.5s ease',
                }}
              >
                {items.length}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {Object.entries(STAGE_CONFIG).map(([key, config]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color, display: 'inline-block' }} />
              {config.emoji} {config.label} ({data[key]?.length || 0})
            </div>
          ))}
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid-2" style={{ marginBottom: 0 }}>
        {stages.map(([stage, items]) => {
          const config = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
          return (
            <div className="card" key={stage}>
              <div className="card-label" style={{ color: config.color }}>
                {config.emoji} {config.label}
              </div>
              {items.map((item) => (
                <div key={item.path} style={{
                  padding: '0.4rem 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                }}>
                  {item.name.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
