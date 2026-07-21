'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, AlertTriangle } from 'lucide-react';

export default function ExperimentsPanel() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/marketing/experiments?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-label"><FlaskConical size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Marketing Experiments</div>
      {data.experiments.length === 0 ? (
        <div className="empty-state" style={{ padding: '1rem', fontSize: '0.85rem' }}>
          No experiments logged yet — duplicate <code>08 Templates/experiment.template.md</code> into <code>04 Experiments/</code> to start one.
        </div>
      ) : (
        <>
          {data.multipleActiveWarning && (
            <div className="approval-meta" style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {data.activeCount} experiments active at once — the plan's rule is one live experiment at a time.
            </div>
          )}
          <div className="approval-list">
            {data.experiments.map((e) => (
              <div className="status-row" key={e.file}>
                <span className="status-label">{e.experiment_id} — {e.hypothesis || '(no hypothesis recorded)'}</span>
                <span className={`status-badge ${e.overdue ? 'offline' : e.status === 'active' ? 'warning' : 'online'}`}>
                  {e.overdue ? 'overdue check' : e.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
