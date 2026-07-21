'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, AlertTriangle, Clock } from 'lucide-react';

function classificationBadgeClass(classification) {
  if (!classification) return 'warning';
  if (/mission/i.test(classification)) return 'online';
  if (/experimental/i.test(classification)) return 'offline';
  return 'warning';
}

function lifecycleBadgeClass(status) {
  if (status === 'Released') return 'online';
  if (status === 'Archived' || status === 'On Hold') return 'offline';
  return 'warning';
}

export default function RadPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/rad?ts=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch((err) => setError(err.message || 'Failed to load RAD projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><Layers size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />RAD — Project Portfolio</h1>
        <p className="subtitle">Every real project, lifecycle stage, and classification — the studio's own name for its own pipeline.</p>
      </div>

      {error && <div className="bet-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="grid-auto">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card empty-state">No RAD projects found.</div>
      ) : (
        <div className="grid-auto">
          {projects.map((p) => (
            <Link key={p.slug} href={`/rad/${p.slug}`} className="card app-card">
              <div className="app-card-header">
                <div className="app-card-title">{p.name}</div>
                <span className={`status-badge ${lifecycleBadgeClass(p.lifecycle_status)}`}>
                  {p.lifecycle_status || 'unknown'}
                </span>
              </div>
              <span className={`status-badge ${classificationBadgeClass(p.app_classification)}`} style={{ marginBottom: '0.6rem', display: 'inline-block' }}>
                {p.app_classification || 'unclassified'}
              </span>
              {p.next_action && (
                <div className="card-subtitle" style={{ marginTop: '0.4rem' }}>
                  <strong>Next:</strong> {p.next_action}
                </div>
              )}
              {p.blocker && (
                <div className="approval-meta" style={{ color: 'var(--danger)', marginTop: '0.6rem' }}>
                  <AlertTriangle size={12} /> {p.blocker}
                </div>
              )}
              {p.health_status && p.health_status !== 'On Track' && (
                <div className="approval-meta" style={{ color: 'var(--danger)', marginTop: '0.4rem' }}>
                  <AlertTriangle size={12} /> {p.health_status}
                  {p.health_issues && p.health_issues.length > 0 ? `: ${p.health_issues.join('; ')}` : ''}
                </div>
              )}
              {p.days_until_launch !== null && p.days_until_launch !== undefined && (
                <div className="approval-meta" style={{ marginTop: '0.6rem' }}>
                  <span><Clock size={12} /> {p.days_until_launch < 0 ? `${Math.abs(p.days_until_launch)}d overdue` : `${p.days_until_launch}d to launch`}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
