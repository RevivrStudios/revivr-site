'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HealthRing from './components/HealthRing';
import { Database, Cpu, Sparkles, TerminalSquare, Activity, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

const NAV_CARDS = [
  { href: '/vault', icon: Database, title: 'Vault Diagnostics', desc: 'Knowledge graph health, orphans, MCP engines, and action center' },
  { href: '/quinn', icon: Cpu, title: 'Quinn', desc: 'Operations, diagnostics, self-repair, and coordination' },
  { href: '/quell', icon: Sparkles, title: 'Quell', desc: 'Marketing, positioning, launch support, and public-facing strategy' },
  { href: '/prompts', icon: TerminalSquare, title: 'Prompt Library', desc: 'App build lifecycle, vault maintenance, and agent command prompts' },
];

export default function Home() {
  const [vault, setVault] = useState(null);
  const [mcp, setMcp] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/vault/health').then(r => r.json()),
        fetch('/api/mcp/status').then(r => r.json()),
      ]);
      if (results[0].status === 'fulfilled') setVault(results[0].value);
      if (results[1].status === 'fulfilled') setMcp(results[1].value);
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

          <div className="section-title"><Activity size={18} className="icon" /> Operational Roster</div>
          <div className="card" style={{ marginBottom: '2.5rem' }}>
            <div className="agent-pip">
              <div className="agent-pip-icon"><TerminalSquare size={20} /></div>
              <div className="agent-pip-info">
                <div className="agent-pip-name">Antigravity</div>
                <div className="agent-pip-role">Build Agent & Primary Code Execution</div>
              </div>
              <div className="status-badge online"><span className="status-dot online"></span> ACTIVE</div>
            </div>
            <div className="agent-pip quinn">
              <div className="agent-pip-icon"><Cpu size={20} /></div>
              <div className="agent-pip-info">
                <div className="agent-pip-name">Quinn</div>
                <div className="agent-pip-role">Operations, Diagnostics & Infrastructure</div>
              </div>
              <div className="status-badge online"><span className="status-dot online"></span> ACTIVE</div>
            </div>
            <div className="agent-pip quell" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="agent-pip-icon"><Sparkles size={20} /></div>
              <div className="agent-pip-info">
                <div className="agent-pip-name">Quell</div>
                <div className="agent-pip-role">Marketing, Launch Strategy & Branding</div>
              </div>
              <div className="status-badge online"><span className="status-dot online"></span> ACTIVE</div>
            </div>
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
