'use client';

import { useEffect, useState } from 'react';
import { GitBranch, HelpCircle } from 'lucide-react';

const STATE_RANK = { red: 0, unknown: 1, amber: 1, error: 1, 'no-git': 1, unavailable: 2, green: 3 };
const STATE_COLOR = { red: 'var(--danger)', amber: 'var(--accent-amber)', green: 'var(--success)' };

// Plain-language glossary for the jargon this section surfaces. Shown from a
// (?) affordance by the title — hover on desktop, tap-to-reveal on mobile.
const LEGEND = [
  ['dirty', 'Files changed in the working tree that haven’t been committed yet (modified or untracked). A non-zero count means work is unsaved to git.'],
  ['since last commit', 'How long ago the most recent commit landed on this repo. A large number can mean the repo is stalled or abandoned.'],
  ['orphan claude/* branch >30d old', 'An agent-created branch (named claude/…) that has sat unmerged and untouched for over 30 days — a cleanup candidate that’s just accumulating.'],
];

function RepoLegend() {
  const [open, setOpen] = useState(false);
  return (
    <span className="repo-legend-wrap">
      <button
        type="button"
        className="repo-legend-btn"
        aria-label="What do these terms mean?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <HelpCircle size={15} />
      </button>
      <div className={`repo-legend ${open ? 'open' : ''}`} role="tooltip">
        {LEGEND.map(([term, def]) => (
          <div key={term} className="repo-legend-item">
            <span className="repo-legend-term">{term}</span>
            <span className="repo-legend-def">{def}</span>
          </div>
        ))}
      </div>
    </span>
  );
}

export default function RepoHygiene() {
  const [repos, setRepos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/repos?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRepos(d.repos || []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="section-title"><GitBranch size={18} className="icon" /> Repo Hygiene <RepoLegend /></div>
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      </div>
    );
  }

  if (!repos || repos.length === 0) return null;

  const sorted = [...repos].sort((a, b) => (STATE_RANK[a.state] ?? 1) - (STATE_RANK[b.state] ?? 1));

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-title"><GitBranch size={18} className="icon" /> Repo Hygiene <RepoLegend /></div>
      <div className="grid-3">
        {sorted.map((r) => {
          const isProblem = r.state === 'red' || r.state === 'no-git' || r.state === 'unavailable' || r.state === 'error';
          return (
            <div
              className="card"
              key={r.repo}
              style={isProblem ? { borderColor: 'rgba(255, 95, 88, 0.35)', background: 'rgba(255, 95, 88, 0.04)' } : undefined}
            >
              <div className="card-label">{r.name}</div>
              {r.state === 'unavailable' && <div className="card-subtitle" style={{ color: 'var(--text-muted)' }}>{r.detail}</div>}
              {r.state === 'no-git' && <div className="card-subtitle" style={{ color: 'var(--danger)' }}>⚠️ No git repository</div>}
              {r.state === 'error' && <div className="card-subtitle" style={{ color: 'var(--danger)' }}>{r.detail}</div>}
              {['red', 'amber', 'green', 'unknown'].includes(r.state) && (
                <>
                  <div className="card-value" style={{ fontSize: '1.9rem', color: STATE_COLOR[r.state] || 'var(--text-primary)' }}>
                    {r.dirtyFiles} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>dirty</span>
                  </div>
                  <div className="card-subtitle">
                    {r.daysSinceCommit === null ? 'no commits' : `${r.daysSinceCommit}d since last commit`} · {r.branchCount} branch{r.branchCount === 1 ? '' : 'es'}
                  </div>
                  {r.orphanBranches?.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                      ⚠️ {r.orphanBranches.length} orphan claude/* branch{r.orphanBranches.length === 1 ? '' : 'es'} &gt;30d old
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
