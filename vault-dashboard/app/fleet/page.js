'use client';

import { useEffect, useState, useCallback } from 'react';
import { Server, RefreshCw, GitCommitHorizontal, Timer, Radio, Lock, Cpu } from 'lucide-react';

const SOFTWARE = {
  claude: { label: 'Claude', cls: 'sw-claude' },
  codex: { label: 'Codex', cls: 'sw-codex' },
  antigravity: { label: 'Antigravity', cls: 'sw-antigravity' },
  gemini: { label: 'Gemini', cls: 'sw-antigravity' },
  unknown: { label: 'Agent', cls: 'sw-unknown' },
};

const STATUS = {
  active: 'st-go', building: 'st-go', running: 'st-go', compiling: 'st-go',
  blocked: 'st-stop', 'needs-decision': 'st-warn', waiting: 'st-warn', review: 'st-warn',
  done: 'st-done', idle: 'st-done',
};

// "1h 42m ago" — for points in time (heartbeat, commit).
function ago(seconds) {
  if (seconds == null) return null;
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

// "1h 42m" — for durations (run time).
function dur(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return '<1m';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function SessionRow({ s }) {
  const sw = SOFTWARE[s.software] || SOFTWARE.unknown;
  const statusCls = STATUS[s.status] || 'st-go';
  return (
    <div className={`fleet-row ${s.stale ? 'stale' : ''}`}>
      <div className="fleet-row-head">
        <span className={`fleet-sw ${sw.cls}`}>{sw.label}</span>
        <span className="fleet-project">{s.project}</span>
        {s.branch && <span className="fleet-branch">{s.branch}</span>}
        <span className={`fleet-status ${statusCls}`}>{s.status.replace('-', ' ')}</span>
        <span className={`fleet-seen ${s.stale ? 'is-stale' : ''}`}>
          <Radio size={11} /> {s.stale ? 'idle · ' : ''}{ago(s.ageSeconds)}
        </span>
      </div>
      <div className="fleet-row-facts">
        <span className="fleet-fact"><Timer size={12} /> run {dur(s.runtimeSeconds)}</span>
        <span className="fleet-fact commit" title={s.commitMsg ? `${s.commit} ${s.commitMsg}` : undefined}>
          <GitCommitHorizontal size={12} />
          {s.commit ? (
            <>
              <code>{s.commit}</code>
              {s.commitMsg && <span className="fleet-commit-msg">{s.commitMsg}</span>}
              {s.commitAgeSeconds != null && <span className="fleet-commit-age">· {ago(s.commitAgeSeconds)}</span>}
            </>
          ) : <span className="fleet-commit-none">no commit recorded</span>}
        </span>
        {s.claim && <span className="fleet-fact claim"><Lock size={11} /> {s.claim}</span>}
      </div>
    </div>
  );
}

export default function FleetPage() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [machineFilter, setMachineFilter] = useState('all');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await fetch(`/api/fleet?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json());
      setData(d);
    } catch {
      setData({ available: false });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  const allMachines = data?.machines || [];
  const shown = machineFilter === 'all' ? allMachines : allMachines.filter((m) => m.machine === machineFilter);
  const shownSessions = shown.flatMap((m) => m.sessions);
  const liveShown = shownSessions.filter((s) => !s.stale).length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><Server size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Fleet</h1>
        <p className="subtitle">Every AI session across your machines — Claude, Codex, Antigravity — from one board.</p>
      </div>

      {data && data.available && allMachines.length > 0 && (
        <div className="fleet-filters">
          <button className={`fleet-filter ${machineFilter === 'all' ? 'on' : ''}`} onClick={() => setMachineFilter('all')}>
            All machines <span className="fleet-filter-n">{allMachines.length}</span>
          </button>
          {allMachines.map((m) => (
            <button key={m.machine} className={`fleet-filter ${machineFilter === m.machine ? 'on' : ''}`} onClick={() => setMachineFilter(m.machine)}>
              {m.machine}
              <span className={`fleet-filter-dot ${m.liveCount ? 'on' : ''}`} />
              <span className="fleet-filter-n">{m.sessions.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="fleet-bar">
        <div className="fleet-counts">
          {data && (
            <>
              <span className="fleet-count-live">{liveShown} live</span>
              <span className="fleet-count-total"> · {shownSessions.length} tracked · {shown.length} machine{shown.length === 1 ? '' : 's'}</span>
              {data.staleMinutes && <span className="fleet-count-total"> · idle after {data.staleMinutes}m</span>}
            </>
          )}
        </div>
        <button className="bv-sync-btn" onClick={load} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {!data ? (
        <div className="loading-shimmer" style={{ height: 120 }} />
      ) : !data.available ? (
        <div className="bv-card">
          <div className="bv-card-title"><Cpu size={16} /> No session board found yet</div>
          <p className="bv-card-body">
            The dashboard is watching <code>{data.dir}</code> for session files but that folder doesn’t exist yet. Each machine’s <code>session-board.sh</code> writes one heartbeat file per running session there, and this page glasses them live.
          </p>
          <p className="bv-hint">Point <code>FLEET_SESSIONS_DIR</code> at whatever folder is synced to this host, then wire the emit hooks per machine.</p>
        </div>
      ) : allMachines.length === 0 ? (
        <div className="bv-card">
          <div className="bv-card-title"><Cpu size={16} /> No active sessions right now</div>
          <p className="bv-card-body">The board is connected — nothing is running at the moment. Active sessions appear here within seconds of starting.</p>
        </div>
      ) : (
        <div className="fleet-grid">
          {shown.map((m) => (
            <div key={m.machine} className="fleet-machine card">
              <div className="fleet-machine-head">
                <div className="fleet-machine-name"><Server size={15} /> {m.machine}</div>
                <div className="fleet-machine-stats">
                  <span className={m.liveCount ? 'fleet-live-dot on' : 'fleet-live-dot'} />
                  {m.liveCount} live{m.staleCount ? ` · ${m.staleCount} idle` : ''}
                </div>
              </div>
              <div className="fleet-sessions">
                {m.sessions.map((s) => <SessionRow key={s.file} s={s} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
