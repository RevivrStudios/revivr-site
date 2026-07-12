'use client';

import { useEffect, useState } from 'react';

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActivityTimeline({ data }) {
  if (!data) return null;

  const { today, thisWeek, thisMonth, older, recentFiles } = data;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">📅</span> Activity Timeline</div>
      <div className="grid-3">
        <div className="card">
          <div className="card-label">Today</div>
          <div className="card-value metric-green">{today.length}</div>
          <div className="card-subtitle">files modified</div>
        </div>
        <div className="card">
          <div className="card-label">This Week</div>
          <div className="card-value metric-blue">{thisWeek.length}</div>
          <div className="card-subtitle">files modified</div>
        </div>
        <div className="card">
          <div className="card-label">This Month</div>
          <div className="card-value metric-cyan">{thisMonth.length}</div>
          <div className="card-subtitle">files modified</div>
        </div>
      </div>

      <div className="card">
        <div className="card-label">Recently Active Files</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {recentFiles.map((f) => (
            <div className="status-row" key={f.path}>
              <div>
                <span className="status-label">{f.name.replace(/_/g, ' ')}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace", marginTop: '2px' }}>
                  {f.path}
                </div>
              </div>
              <span className="status-badge online" style={{ whiteSpace: 'nowrap' }}>
                {timeAgo(f.modified)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
