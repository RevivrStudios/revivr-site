'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HardDrive, Trash2 } from 'lucide-react';

const AGE_PRESETS = [30, 90, 180];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function ManageMedia() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('project'); // 'project' | 'time'
  const [selectedApp, setSelectedApp] = useState('');
  const [ageDays, setAgeDays] = useState(90);
  const [override, setOverride] = useState(false);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/social/media?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setGroups(data.groups || []);
      setTotalBytes(data.totalBytes || 0);
    } catch (err) {
      setError(err.message || 'Failed to load media.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const apps = useMemo(() => [...new Set(groups.map((g) => g.app).filter(Boolean))], [groups]);

  const candidates = useMemo(() => {
    if (mode === 'project') {
      if (!selectedApp) return [];
      return groups.filter((g) => g.app === selectedApp);
    }
    return groups.filter((g) => (g.ageDays ?? 0) >= ageDays);
  }, [groups, mode, selectedApp, ageDays]);

  const clearableCandidates = candidates.filter((g) => override || !g.protectedByDefault);
  const candidateBytes = clearableCandidates.reduce((sum, g) => sum + g.totalBytes, 0);

  async function clearSelected() {
    if (!clearableCandidates.length) return;
    setClearing(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/social/media/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_ids: clearableCandidates.map((g) => g.drop_id), override }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to clear media.');
        return;
      }
      await load();
    } catch (err) {
      setError(err.message || 'Failed to clear media.');
    } finally {
      setClearing(false);
    }
  }

  if (!open) {
    return (
      <button className="action-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem', marginBottom: '1.5rem' }} onClick={() => setOpen(true)}>
        <HardDrive size={14} /> Manage Media
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="approval-card-header">
        <div className="card-label"><HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Manage Media — {formatBytes(totalBytes)} total</div>
        <button className="action-btn" onClick={() => setOpen(false)}>Close</button>
      </div>

      <div className="tab-container" style={{ marginTop: '0.5rem' }}>
        <button className={`tab-btn ${mode === 'project' ? 'active' : ''}`} onClick={() => setMode('project')}>By Project</button>
        <button className={`tab-btn ${mode === 'time' ? 'active' : ''}`} onClick={() => setMode('time')}>By Time</button>
      </div>

      {mode === 'project' ? (
        <label className="bet-field">
          <span className="bet-field-label">App</span>
          <select className="field-input" value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)}>
            <option value="">— select an app —</option>
            {apps.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="bet-field-row">
          {AGE_PRESETS.map((d) => (
            <button key={d} className={`tab-btn ${ageDays === d ? 'active' : ''}`} onClick={() => setAgeDays(d)}>
              {d}+ days
            </button>
          ))}
          <input
            className="field-input"
            type="number"
            min="1"
            style={{ width: '90px' }}
            value={ageDays}
            onChange={(e) => setAgeDays(Number(e.target.value) || 0)}
          />
        </div>
      )}

      <label className="approval-lesson-toggle" style={{ marginTop: '0.5rem' }}>
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        Include unposted/undrafted media (override — normally protected)
      </label>

      {error && <div className="bet-error">{error}</div>}

      {loading ? (
        <div className="loading-shimmer" />
      ) : candidates.length === 0 ? (
        <div className="card empty-state">No matching drops.</div>
      ) : (
        <>
          <div className="approval-list" style={{ marginTop: '0.75rem' }}>
            {candidates.map((g) => (
              <div key={g.drop_id} className="status-row" style={{ opacity: g.protectedByDefault && !override ? 0.5 : 1 }}>
                <span className="status-label">
                  {g.title} {g.app ? `(${g.app})` : ''} — {g.files.length} file(s), {formatBytes(g.totalBytes)}, {g.ageDays}d old
                  {g.protectedByDefault && <em> — protected (unposted)</em>}
                </span>
              </div>
            ))}
          </div>

          <div className="approval-actions" style={{ marginTop: '0.75rem' }}>
            <button className="action-btn danger" disabled={clearing || !clearableCandidates.length} onClick={clearSelected}>
              <Trash2 size={16} />
              {clearing ? 'Clearing…' : `Clear ${clearableCandidates.length} drop(s) — reclaim ${formatBytes(candidateBytes)}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
