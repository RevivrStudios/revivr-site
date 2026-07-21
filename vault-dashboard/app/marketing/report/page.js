'use client';

import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, FlaskConical } from 'lucide-react';
import MarketingTabs from '../MarketingTabs';
import TrendChart from './TrendChart';
import TypeBreakdownChart from './TypeBreakdownChart';
import ExperimentsPanel from './ExperimentsPanel';

const CHANNEL_LABEL = { 'x-personal': 'Personal X', 'x-company': 'Company X', linkedin: 'LinkedIn', 'youtube-package': 'YouTube' };

function ChannelSection({ channel, data }) {
  if (!data.hasData) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">{CHANNEL_LABEL[channel] || channel}</div>
        <div className="empty-state" style={{ padding: '1rem', fontSize: '0.85rem' }}>
          Nothing published on this channel yet — nothing to report.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="approval-card-header">
        <div className="card-label">{CHANNEL_LABEL[channel] || channel}</div>
        <span className="approval-meta">as of {data.asOf}</span>
      </div>

      {data.triage && (
        <div className="approval-meta" style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
          <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
          <strong>{data.triage.label}:</strong> {data.triage.detail}
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Weekly impressions trend</div>
        <TrendChart trend={data.trend} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>By content type</div>
        <TypeBreakdownChart byType={data.byType} />
      </div>

      <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Posts (table view)</div>
        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.3rem 0.5rem' }}>Posted</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Type</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Likes</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Retweets</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Replies</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Impressions</th>
              <th style={{ padding: '0.3rem 0.5rem' }}>Post</th>
            </tr>
          </thead>
          <tbody>
            {data.posts.map((p) => (
              <tr key={p.link} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.postedDate}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.type}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.likes}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.retweets}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.replies}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>{p.impressions.toLocaleString()}</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>
                  <a href={p.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>View →</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MarketingReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marketing/report?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><BarChart3 size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Report</h1>
        <p className="subtitle">Engagement by channel, weekly trend, and which content types earn the audience.</p>
      </div>

      <MarketingTabs />

      <ExperimentsPanel />

      {loading ? (
        <div className="grid-2">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : !report ? (
        <div className="card empty-state">Failed to load the report.</div>
      ) : (
        Object.entries(report.channels).map(([channel, data]) => (
          <ChannelSection key={channel} channel={channel} data={data} />
        ))
      )}
    </div>
  );
}
