'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, Clock } from 'lucide-react';
import MarketingTabs from '../MarketingTabs';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function slugifyHeading(heading) {
  return 'section-' + heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function classificationBadgeClass(classification) {
  if (!classification) return 'warning';
  if (/mission|brand/i.test(classification)) return 'online';
  if (/experimental/i.test(classification)) return 'offline';
  return 'warning'; // Pipeline, or anything else
}

export default function MarketingAppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/marketing/apps?ts=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setApps(data.apps || []))
      .catch((err) => setError(err.message || 'Failed to load app profiles.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><Smartphone size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />App Marketing Profiles</h1>
        <p className="subtitle">Every real Revivr app, in one place — including the ones that never had a marketing presence before.</p>
      </div>

      <MarketingTabs />

      {error && <div className="bet-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="grid-auto">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : apps.length === 0 ? (
        <div className="card empty-state">No app profiles found in the marketing vault.</div>
      ) : (
        <div className="grid-auto">
          {apps.map((app) => {
            const age = daysSince(app.last_review);
            return (
              <Link
                key={app.slug}
                href={app.firstIncompleteSection ? `/marketing/apps/${app.slug}#${slugifyHeading(app.firstIncompleteSection)}` : `/marketing/apps/${app.slug}`}
                className="card app-card"
              >
                <div className="app-card-header">
                  <div className="app-card-title">{app.title}</div>
                  <span className={`status-badge ${classificationBadgeClass(app.app_classification)}`}>
                    {app.app_classification || 'unclassified'}
                  </span>
                </div>
                {app.platforms && <div className="card-subtitle">{app.platforms}</div>}
                {app.status && <div className="app-card-status">{app.status}</div>}
                <div className="app-card-completeness">
                  <div className="app-card-completeness-bar">
                    <div
                      className="app-card-completeness-fill"
                      style={{ width: `${(app.completeness.filled / app.completeness.total) * 100}%` }}
                    />
                  </div>
                  <span>
                    {app.completeness.filled}/{app.completeness.total} sections filled
                    {app.firstIncompleteSection ? ` — next: ${app.firstIncompleteSection}` : ''}
                  </span>
                </div>
                {app.last_review && (
                  <div className="approval-meta" style={{ marginTop: '0.75rem' }}>
                    <span><Clock size={12} /> reviewed {app.last_review}{age !== null ? ` · ${age}d ago` : ''}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
