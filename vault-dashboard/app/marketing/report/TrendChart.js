'use client';

import { useState } from 'react';

// Single-series line — impressions per week for one channel. One hue
// (magnitude, not identity), so no categorical palette needed. 2px line,
// rounded caps, markers >=8px hit target via an invisible wider hover circle.
export default function TrendChart({ trend, color = 'var(--accent-orange)' }) {
  const [hover, setHover] = useState(null);
  if (!trend || trend.length === 0) {
    return <div className="empty-state" style={{ padding: '1rem', fontSize: '0.85rem' }}>No weekly trend data yet.</div>;
  }

  const width = 560;
  const height = 160;
  const padding = { top: 12, right: 16, bottom: 24, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...trend.map((t) => t.impressions), 1);
  const points = trend.map((t, i) => ({
    x: padding.left + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW),
    y: padding.top + innerH - (t.impressions / maxVal) * innerH,
    ...t,
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Weekly impressions trend">
        <line x1={padding.left} y1={padding.top + innerH} x2={width - padding.right} y2={padding.top + innerH} stroke="var(--border-subtle)" strokeWidth="1" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <g key={p.week}>
            <circle
              cx={p.x} cy={p.y} r={10}
              fill="transparent"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
          </g>
        ))}
        {points.map((p, i) => (
          (i === 0 || i === points.length - 1) && (
            <text key={`label-${p.week}`} x={p.x} y={height - 4} fontSize="9" fill="var(--text-muted)" textAnchor={i === 0 ? 'start' : 'end'}>
              {p.week}
            </text>
          )
        ))}
      </svg>
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: `${(hover.x / width) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '0.35rem 0.6rem',
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {hover.week}: {hover.impressions.toLocaleString()} impressions
        </div>
      )}
    </div>
  );
}
