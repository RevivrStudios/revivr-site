'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cpu, Activity, ScrollText, BookOpen, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import PlaceholderSection from '../components/PlaceholderSection';

const STATUS_COLORS = { online: 'var(--success, #3ddc84)', stale: 'var(--warning, #ffb020)', offline: 'var(--danger, #ff5c5c)' };

export default function QuinnPage() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.allSettled([
      fetch('/api/agents/heartbeat').then((r) => r.json()),
      fetch('/api/actions?limit=40').then((r) => r.json()),
    ]);
    if (a.status === 'fulfilled' && a.value.success) setAgents(a.value.agents);
    if (b.status === 'fulfilled' && b.value.success) setActions(b.value.actions);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>Quinn</h1>
        <p className="subtitle">Operations, diagnostics, self-repair, and coordination</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-label"><Activity size={16} /> Runtime Status (live heartbeats)</div>
          {loading && agents.length === 0 && <div className="loading-shimmer" style={{ height: 60 }} />}
          {!loading && agents.length === 0 && (
            <div className="card-subtitle" style={{ lineHeight: 1.6 }}>
              No heartbeats received yet. Have each agent&apos;s launch script (or a cron job) POST to
              <code> /api/agents/heartbeat</code> with <code>{'{"agent","machine","role","status"}'}</code> —
              status here is derived from real last-seen times, never hardcoded.
            </div>
          )}
          {agents.map((a) => (
            <div key={a.agent} className="agent-pip">
              <div className="agent-pip-icon"><Cpu size={18} /></div>
              <div className="agent-pip-info">
                <div className="agent-pip-name">{a.agent}</div>
                <div className="agent-pip-role">{a.role || a.detail || '—'} · {a.machine}</div>
              </div>
              <div className="status-badge" style={{ color: STATUS_COLORS[a.derivedStatus] }}>
                <span className="status-dot" style={{ background: STATUS_COLORS[a.derivedStatus] }}></span>
                {a.derivedStatus.toUpperCase()} ({a.minutesSinceSeen}m ago)
              </div>
            </div>
          ))}
          <button className="action-btn" style={{ marginTop: '0.8rem' }} onClick={load}><RefreshCw size={13} /> Refresh</button>
        </div>

        <div className="card" style={{ maxHeight: 520, overflowY: 'auto' }}>
          <div className="card-label"><ScrollText size={16} /> Recent Actions (append-only audit log)</div>
          {actions.length === 0 && <div className="card-subtitle">No actions logged yet. Shell executes, assistant turns, problem updates, and feed refreshes all land here.</div>}
          {actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.83rem' }}>
              {a.success ? <CheckCircle2 size={13} color="var(--success, #3ddc84)" /> : <XCircle size={13} color="var(--danger, #ff5c5c)" />}
              <span style={{ opacity: 0.55, whiteSpace: 'nowrap' }}>{new Date(a.timestamp).toLocaleString()}</span>
              <span className="chat-tool-chip">{a.source}</span>
              <span>{a.label || a.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title" style={{ marginTop: '1.5rem' }}><BookOpen size={18} className="icon" /> Runbooks & Prompts</div>
      <div className="grid-2">
        <PlaceholderSection title="Diagnostic Prompts" description="Prompts for system analysis and health assessment — see the Prompt Library for the current set" />
        <PlaceholderSection title="Repair / Recovery Prompts" description="Prompts for self-repair and incident recovery workflows — see the Prompt Library" />
      </div>
    </div>
  );
}
