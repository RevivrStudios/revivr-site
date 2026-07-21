'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, RefreshCw, LineChart, Download } from 'lucide-react';

function fmtInt(n) {
  return n == null ? '—' : Number(n).toLocaleString();
}
function fmtMoney(n) {
  return n == null ? '—' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function Wow({ v }) {
  if (v == null || v === 0) return null;
  const up = v > 0;
  return <span className={`bv-wow ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {fmtInt(Math.abs(v))}</span>;
}

export default function BusinessVitals() {
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(null); // 'sync' | 'provision'

  const load = useCallback(async () => {
    try {
      const d = await fetch(`/api/business/vitals?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json());
      setState({ loading: false, ...d });
    } catch (err) {
      setState({ loading: false, status: 'error', error: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sync({ provision } = {}) {
    setBusy(provision ? 'provision' : 'sync');
    try {
      const d = await fetch('/api/business/vitals/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provision: !!provision }),
      }).then((r) => r.json());
      if (d.status === 'ok') setState({ loading: false, status: 'ok', vitals: d.vitals });
      else setState((s) => ({ ...s, error: d.error }));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setBusy(null);
    }
  }

  const Header = (
    <div className="section-title">
      <TrendingUp size={18} className="icon" /> Business Vitals
      {state.vitals?.generatedAt && (
        <span className="bv-synced">synced {new Date(state.vitals.generatedAt).toLocaleDateString()}</span>
      )}
      <button className="bv-sync-btn" onClick={() => sync()} disabled={!!busy} title="Sync from App Store Connect">
        <RefreshCw size={13} className={busy === 'sync' ? 'spin' : ''} /> {busy === 'sync' ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  );

  if (state.loading) {
    return <div className="bv-section">{Header}<div className="loading-shimmer" style={{ height: 90 }} /></div>;
  }

  const vitals = state.vitals;
  const overall = state.status === 'unsynced' ? 'unsynced' : vitals?.overall;

  // Real numbers.
  if (overall === 'ready') {
    return (
      <div className="bv-section">
        {Header}
        <div className="bv-totals">
          <div className="bv-total">
            <span className="bv-total-num">{fmtInt(vitals.totals.units)}</span>
            <span className="bv-total-label">units this week</span>
          </div>
          <div className="bv-total">
            <span className="bv-total-num">{fmtMoney(vitals.totals.proceeds)}</span>
            <span className="bv-total-label">proceeds this week</span>
          </div>
          <div className="bv-total bv-total-muted">
            <span className="bv-total-num">{vitals.apps.length}</span>
            <span className="bv-total-label">apps · week of {vitals.week}</span>
          </div>
        </div>
        <div className="bv-grid">
          {vitals.apps.map((a) => (
            <div key={a.id} className="bv-app">
              <div className="bv-app-name">{a.name}</div>
              <div className="bv-app-metrics">
                <span className="bv-app-units">{fmtInt(a.units)}<em>units</em> <Wow v={a.wowUnits} /></span>
                <span className="bv-app-proceeds">{fmtMoney(a.proceeds)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Analytics enabled, waiting on Apple to generate the first reports.
  if (overall === 'provisioning') {
    return (
      <div className="bv-section">
        {Header}
        <div className="bv-card">
          <div className="bv-card-title"><LineChart size={16} /> Reporting is warming up</div>
          <p className="bv-card-body">
            {vitals?.vendorConfigured
              ? 'Sales & Trends is connected but reported no units for the last complete week. New numbers appear here after each sync.'
              : 'App Store analytics is enabled — Apple generates the first reports within ~24–48h. Add your vendor number below for instant Sales & Trends in the meantime.'}
          </p>
          {!vitals?.vendorConfigured && (
            <p className="bv-hint">Set <code>ASC_VENDOR_NUMBER</code> in <code>~/.revivr-dashboard.env</code> (App Store Connect → Payments and Financial Reports → your vendor #), then Sync.</p>
          )}
        </div>
      </div>
    );
  }

  if (overall === 'error') {
    return (
      <div className="bv-section">
        {Header}
        <div className="bv-card bv-card-error">Couldn’t reach App Store Connect: {vitals?.error || state.error}</div>
      </div>
    );
  }

  // 'unsynced' or 'setup' — guide the two connection paths.
  return (
    <div className="bv-section">
      {Header}
      <div className="bv-card">
        <div className="bv-card-title"><Download size={16} /> Connect your business numbers</div>
        <p className="bv-card-body">
          Pull real units, proceeds, and the download funnel straight from App Store Connect via the <code>asc</code> CLI (already authenticated on this Mac). Two paths:
        </p>
        <ol className="bv-steps">
          <li><strong>Instant Sales &amp; Trends</strong> — set <code>ASC_VENDOR_NUMBER</code> in <code>~/.revivr-dashboard.env</code> (App Store Connect → Payments and Financial Reports), then Sync. Real units + proceeds immediately.</li>
          <li><strong>Rich analytics funnel</strong> — enable the Analytics Reports API once; Apple generates impressions → downloads → conversion over ~24–48h.</li>
        </ol>
        <div className="bv-actions">
          <button className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => sync()} disabled={!!busy}>
            <RefreshCw size={15} className={busy === 'sync' ? 'spin' : ''} /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}
          </button>
          <button className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => sync({ provision: true })} disabled={!!busy}>
            <LineChart size={15} className={busy === 'provision' ? 'spin' : ''} /> {busy === 'provision' ? 'Enabling…' : 'Enable analytics reporting'}
          </button>
        </div>
        {state.error && <div className="bv-card-error" style={{ marginTop: '0.75rem' }}>{state.error}</div>}
      </div>
    </div>
  );
}
