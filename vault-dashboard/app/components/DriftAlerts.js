'use client';

import { useEffect, useState } from 'react';

const ALERT_COLORS = {
  high: { bg: 'hsla(0, 70%, 50%, 0.1)', border: 'hsla(0, 70%, 50%, 0.3)', text: 'var(--accent-red)', icon: '🔴' },
  medium: { bg: 'hsla(35, 80%, 50%, 0.1)', border: 'hsla(35, 80%, 50%, 0.3)', text: 'var(--accent-amber)', icon: '🟡' },
  low: { bg: 'hsla(145, 70%, 50%, 0.08)', border: 'hsla(145, 70%, 50%, 0.2)', text: 'var(--accent-green)', icon: '🟢' },
};

export default function DriftAlerts() {
  const [drift, setDrift] = useState(null);

  useEffect(() => {
    fetch('/api/vault/drift')
      .then(r => r.json())
      .then(setDrift)
      .catch(() => {});
  }, []);

  if (!drift || !drift.success) return null;

  const style = ALERT_COLORS[drift.alertLevel] || ALERT_COLORS.low;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">⚠️</span> API Drift Monitor</div>

      {/* Alert banner */}
      <div style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{style.icon}</span>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: style.text }}>
            {drift.watchlist.length} Active Drift Warning{drift.watchlist.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Baseline: {drift.baseline.lastMaintained} · Platform: {drift.baseline.platform}
          </div>
        </div>
      </div>

      {/* Watchlist items */}
      <div className="card">
        <div className="card-label">Active Watchlist</div>
        {drift.watchlist.map((item, i) => (
          <div key={i} style={{
            padding: '0.75rem 0',
            borderBottom: i < drift.watchlist.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              ⚡ {item.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', marginBottom: '0.25rem' }}>
              Risk: {item.risk}
            </div>
            {item.currentRule && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                Rule: {item.currentRule}
              </div>
            )}
            {item.affectedModules && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
                Modules: {item.affectedModules}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
