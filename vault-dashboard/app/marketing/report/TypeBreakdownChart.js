'use client';

// Horizontal bars, one hue (magnitude — total engagement per content type),
// direct labels on every bar so identity never depends on color alone.
export default function TypeBreakdownChart({ byType, color = 'var(--accent-orange)' }) {
  const entries = Object.entries(byType || {});
  if (entries.length === 0) {
    return <div className="empty-state" style={{ padding: '1rem', fontSize: '0.85rem' }}>No content-type data yet.</div>;
  }

  const engagementOf = (v) => v.likes + v.retweets + v.replies;
  const sorted = entries.sort(([, a], [, b]) => engagementOf(b) - engagementOf(a));
  const maxVal = Math.max(...sorted.map(([, v]) => engagementOf(v)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map(([type, v]) => {
        const engagement = engagementOf(v);
        const pct = (engagement / maxVal) * 100;
        return (
          <div key={type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{type}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{engagement} engagement · {v.posts} post{v.posts === 1 ? '' : 's'} · {v.impressions.toLocaleString()} impr.</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(pct, 2)}%`, background: color, borderRadius: '4px' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
