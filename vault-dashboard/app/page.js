'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HealthRing from './components/HealthRing';
import { Database, Cpu, Sparkles, TerminalSquare, Activity, ChevronRight, CheckCircle2, AlertCircle, Beaker } from 'lucide-react';

const NAV_CARDS = [
  { href: '/assistant', icon: Cpu, title: 'Assistant', desc: 'Resident operations AI — vault-aware, project context auto-loaded' },
  { href: '/problems', icon: AlertCircle, title: 'Problems', desc: 'Capture a problem once, solve it without re-explaining' },
  { href: '/awareness', icon: Activity, title: 'Awareness', desc: 'AI, healthcare, robotics & Apple ecosystem briefings' },
  { href: '/vault', icon: Database, title: 'Vault Diagnostics', desc: 'Knowledge graph health, orphans, MCP engines, and action center' },
  { href: '/quinn', icon: Cpu, title: 'Quinn', desc: 'Live agent status, action audit log, and operations runbooks' },
  { href: '/quell', icon: Sparkles, title: 'Quell', desc: 'App portfolio, App Store reviews, and launch pipeline' },
  { href: '/resources', icon: Database, title: 'Resources', desc: 'Machines, drives, certificates & subscriptions with expiry radar' },
  { href: '/prompts', icon: TerminalSquare, title: 'Prompt Library', desc: 'App build lifecycle, vault maintenance, and agent command prompts' },
  { href: '/incubator', icon: Beaker, title: 'Incubator', desc: 'Early-stage experiments, prototypes, and tracking layer before RAD' },
];

export default function Home() {
  const [vault, setVault] = useState(null);
  const [mcp, setMcp] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/vault/health').then(r => r.json()),
        fetch('/api/mcp/status').then(r => r.json()),
        fetch('/api/agents/heartbeat').then(r => r.json()),
      ]);
      if (results[0].status === 'fulfilled') setVault(results[0].value);
      if (results[1].status === 'fulfilled') setMcp(results[1].value);
      if (results[2].status === 'fulfilled' && results[2].value.success) setAgents(results[2].value.agents);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const summary = vault?.summary || {};
  const engines = mcp?.engines || {};
  const onlineCount = Object.values(engines).filter(e => ['online', 'ready', 'indexed'].includes(e.status)).length;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Revivr Online Operations — Command Center</p>
        {vault?.timestamp && (
          <div className="timestamp"><CheckCircle2 size={14} color="var(--success)" /> Last synchronized: {new Date(vault.timestamp).toLocaleString()}</div>
        )}
      </div>

      {loading ? (
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : (
        <>
          <div className="grid-3">
            <div className="card">
              <div className="card-label"><Activity size={16} /> Graph Health</div>
              <div className="health-ring-container">
                <HealthRing score={summary.healthScore || 0} />
                <div>
                  <div className="card-value metric-amber">{summary.totalFiles || 0}</div>
                  <div className="card-subtitle">Active Documents</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-label"><Database size={16} /> MCP Engines</div>
              <div className="card-value metric-green">{onlineCount}</div>
              <div className="card-subtitle">{onlineCount} of {Object.keys(engines).length} engines active</div>
            </div>

            <div className="card">
              <div className="card-label"><AlertCircle size={16} /> Orphan Files</div>
              <div className="card-value" style={{ color: summary.orphanCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {summary.orphanCount ?? '—'}
              </div>
              <div className="card-subtitle">
                {summary.orphanCount === 0 ? '✓ Graph integrity intact' : 'Disconnected nodes detected'}
              </div>
            </div>
          </div>

          <div className="section-title"><Activity size={18} className="icon" /> Operational Roster (live)</div>
          <div className="card" style={{ marginBottom: '2.5rem' }}>
            {agents.length === 0 && (
              <div className="card-subtitle">
                No agent heartbeats yet — status is now derived from real check-ins, not hardcoded.
                Agents POST to /api/agents/heartbeat; see the Quinn page for details.
              </div>
            )}
            {agents.map((a, i) => (
              <div key={a.agent} className="agent-pip" style={i === agents.length - 1 ? { borderBottom: 'none', paddingBottom: 0 } : undefined}>
                <div className="agent-pip-icon"><Cpu size={20} /></div>
                <div className="agent-pip-info">
                  <div className="agent-pip-name">{a.agent}</div>
                  <div className="agent-pip-role">{a.role || '—'} · {a.machine}</div>
                </div>
                <div className={`status-badge ${a.derivedStatus === 'online' ? 'online' : ''}`}>
                  <span className={`status-dot ${a.derivedStatus === 'online' ? 'online' : ''}`}></span>
                  {a.derivedStatus.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          <div className="section-title"><ChevronRight size={18} className="icon" /> Quick Navigation</div>
          <div className="grid-4">
            {NAV_CARDS.map((card, i) => (
              <Link key={card.href} href={card.href} className="nav-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="nav-card-icon"><card.icon size={28} strokeWidth={2} /></span>
                <span className="nav-card-title">{card.title}</span>
                <span className="nav-card-desc">{card.desc}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
