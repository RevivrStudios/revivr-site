'use client';

import { useState, useEffect, useCallback } from 'react';
import HealthRing from '../components/HealthRing';
import StatusBadge from '../components/StatusBadge';
import KnowledgeGraph from '../components/KnowledgeGraph';
import ActivityTimeline from '../components/ActivityTimeline';
import PRDPipeline from '../components/PRDPipeline';
import ConfidenceHeatmap from '../components/ConfidenceHeatmap';
import DriftAlerts from '../components/DriftAlerts';
import VaultStats from '../components/VaultStats';
import ReportsIntelligence from '../components/ReportsIntelligence';
import { Activity, Zap, Play, RefreshCw, LayoutGrid, Box, FileText, CheckCircle2 } from 'lucide-react';

export default function VaultPage() {
  const [vault, setVault] = useState(null);
  const [mcp, setMcp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState(null);
  const [actionLog, setActionLog] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function exportReport() {
    setReportLoading(true);
    try {
      const res = await fetch('/api/vault/report');
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch (err) { console.error('Failed to generate report:', err); }
    finally { setReportLoading(false); }
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const results = await Promise.allSettled([
        fetch('/api/vault/health').then(r => r.json()),
        fetch('/api/mcp/status').then(r => r.json()),
        fetch('/api/vault/analytics').then(r => r.json()),
      ]);
      if (results[0].status === 'fulfilled') setVault(results[0].value);
      if (results[1].status === 'fulfilled') setMcp(results[1].value);
      if (results[2].status === 'fulfilled') setAnalytics(results[2].value);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) setError(failures.map(f => f.reason?.message || String(f.reason)).join('; '));
    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function executeAction(action) {
    setRunningAction(action); setActionLog(null);
    try {
      const res = await fetch('/api/mcp/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      setActionLog(data); fetchData();
    } catch (err) { setActionLog({ success: false, error: err.message }); }
    finally { setRunningAction(null); }
  }

  if (loading && !vault) {
    return (
      <div>
        <div className="page-header"><h1>Vault Diagnostics</h1><p className="subtitle">Loading…</p></div>
        <div className="grid-3"><div className="loading-shimmer" /><div className="loading-shimmer" /><div className="loading-shimmer" /></div>
      </div>
    );
  }

  if (!vault && error) {
    return (
      <div>
        <div className="page-header"><h1>Vault Diagnostics</h1><p className="subtitle" style={{ color: 'var(--danger)' }}>Failed to connect</p></div>
        <div className="card">
          <div className="card-label" style={{ color: 'var(--danger)' }}>Connection Error</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>
          <button className="action-btn" onClick={fetchData} style={{ marginTop: '1rem', width: 'auto' }}>Retry</button>
        </div>
      </div>
    );
  }

  const summary = vault?.summary || {};
  const engines = mcp?.engines || {};

  return (
    <div>
      <div className="page-header">
        <h1>Vault Diagnostics</h1>
        <p className="subtitle">Knowledge Graph Health Monitor</p>
        {vault?.timestamp && <div className="timestamp">Last scanned: {new Date(vault.timestamp).toLocaleString()}</div>}
      </div>

      {/* Vault Vitals */}
      <div className="section-title"><Activity size={18} className="icon" /> Vault Vitals</div>
      <div className="grid-3">
        <div className="card">
          <div className="card-label">Graph Health Score</div>
          <div className="health-ring-container">
            <HealthRing score={summary.healthScore || 0} />
            <div>
              <div className="card-value metric-amber">{summary.totalFiles || 0}</div>
              <div className="card-subtitle">Total Documents</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-label">Orphan Files</div>
          <div className="card-value" style={{ color: summary.orphanCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{summary.orphanCount ?? '—'}</div>
          <div className="card-subtitle">{summary.orphanCount === 0 ? '✓ No orphans detected' : 'Files with zero links'}</div>
        </div>
        <div className="card">
          <div className="card-label">Decayed Documentation</div>
          <div className="card-value" style={{ color: summary.decayedCount > 0 ? 'var(--warning)' : 'var(--success)' }}>{summary.decayedCount ?? '—'}</div>
          <div className="card-subtitle">{summary.decayedCount === 0 ? '✓ All docs current' : 'Last verified 6+ months ago'}</div>
        </div>
      </div>

      <KnowledgeGraph />
      <ReportsIntelligence />
      <ActivityTimeline data={analytics?.activity} />
      <VaultStats linkDensity={analytics?.linkDensity} growthHistory={analytics?.growthHistory} />

      {/* MCP Engine Status */}
      <div className="section-title"><Zap size={18} className="icon" /> MCP Engine Status</div>
      <div className="grid-2">
        <div className="card">
          {Object.values(engines).map((engine) => (
            <div className="status-row" key={engine.name}>
              <span className="status-label">{engine.name}</span>
              <StatusBadge status={engine.status} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-label">Orphan Files Detected</div>
          {vault?.orphans?.length > 0 ? (
            <ul className="orphan-list">{vault.orphans.map((file) => (<li key={file}>{file}</li>))}</ul>
          ) : (<div className="empty-state">No orphan files — graph integrity is intact.</div>)}
        </div>
      </div>

      {/* Action Center */}
      <div className="section-title"><Play size={18} className="icon" /> Action Center</div>
      <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <button className={`action-btn ${runningAction === 'rebuild_vector' ? 'running' : 'danger'}`} onClick={() => executeAction('rebuild_vector')} disabled={runningAction !== null}>
          {runningAction === 'rebuild_vector' ? <span className="spinner" /> : <RefreshCw size={16} />} Rebuild Vector Database
        </button>
        <button className={`action-btn ${runningAction === 'suggest_links_bulk' ? 'running' : ''}`} onClick={() => executeAction('suggest_links_bulk')} disabled={runningAction !== null}>
          {runningAction === 'suggest_links_bulk' ? <span className="spinner" /> : <LayoutGrid size={16} />} Run Turbovault Link Audit
        </button>
        <button className="action-btn" onClick={fetchData} disabled={runningAction !== null}><RefreshCw size={16} /> Refresh Diagnostics</button>
        <button className={`action-btn ${runningAction === 'post_sprint_extraction' ? 'running' : 'danger'}`} onClick={() => executeAction('post_sprint_extraction')} disabled={runningAction !== null} style={{ background: 'hsla(30, 90%, 50%, 0.08)', borderColor: 'hsla(30, 90%, 50%, 0.2)' }}>
          {runningAction === 'post_sprint_extraction' ? <span className="spinner" /> : <Box size={16} />} Post-Sprint Extraction
        </button>
        <button className={`action-btn ${reportLoading ? 'running' : ''}`} onClick={exportReport} disabled={reportLoading} style={{ background: 'hsla(280, 60%, 50%, 0.08)', borderColor: 'hsla(280, 60%, 50%, 0.2)' }}>
          {reportLoading ? <span className="spinner" /> : <FileText size={16} />} Export Report
        </button>
      </div>

      {actionLog && (
        <div className="card">
          <div className="card-label"><CheckCircle2 size={16} color={actionLog.success ? "var(--success)" : "var(--danger)"} /> Execution Log — {actionLog.label || actionLog.action}</div>
          <div className="log-output">{actionLog.output || actionLog.error || 'No output captured.'}</div>
        </div>
      )}

      <PRDPipeline data={analytics?.prdPipeline} />
      <DriftAlerts />
      <ConfidenceHeatmap data={analytics?.confidence} />

      {/* Report Modal */}
      {report && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setReport(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', maxWidth: '720px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Diagnostics Report</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={copyReport} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: copied ? '1px solid rgba(67,226,143,0.3)' : '1px solid rgba(255,179,71,0.3)', background: copied ? 'rgba(67,226,143,0.1)' : 'rgba(255,179,71,0.1)', color: copied ? 'var(--success)' : 'var(--accent-amber)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={() => setReport(null)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>
              </div>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'SF Mono', monospace", fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{report}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
