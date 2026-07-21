'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import DetailPanel from './DetailPanel';

// Zero-noise command-deck tile: renders nothing unless something is expired or
// due within the horizon, so it never competes for attention when everything
// is current. Source of truth is Infrastructure/RENEWALS.md (read via
// /api/renewals). Deliberately not a nav item — the retired Resources page was
// exactly the "always-visible surface for something usually empty" mistake.
export default function RenewalsTile() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null); // index into `due`

  useEffect(() => {
    fetch(`/api/renewals?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {});
  }, []);

  const due = items
    .filter((i) => i.expired || i.expiring)
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

  if (due.length === 0) return null;

  const active = selected != null ? due[selected] : null;

  return (
    <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--danger)' }}>
      <div className="card-label"><CalendarClock size={16} /> Renewals due ({due.length})</div>
      {due.map((i, idx) => (
        <button key={idx} className="renewal-row" onClick={() => setSelected(idx)}>
          <span className="renewal-row-label">
            {i.item}{i.type ? ` · ${i.type}` : ''}{i.cost && i.cost !== '—' ? ` · ${i.cost}` : ''}
          </span>
          <span className="renewal-row-right">
            <span
              className="status-badge"
              style={{ color: i.expired ? 'var(--danger)' : 'var(--warning)', whiteSpace: 'nowrap' }}
            >
              {i.expired ? `expired ${Math.abs(i.daysLeft)}d ago` : `${i.daysLeft}d left`}
            </span>
            <ChevronRight size={15} className="renewal-row-chevron" />
          </span>
        </button>
      ))}

      <DetailPanel
        open={active != null}
        onClose={() => setSelected(null)}
        title={active?.item}
        badge={active?.type || 'Renewal'}
        tone="danger"
      >
        {active && (
          <>
            <div className="dp-section-label">Status</div>
            <div className="dp-callout" style={{ borderColor: active.expired ? 'var(--danger)' : 'var(--border-warm)' }}>
              {active.expired
                ? `Expired ${Math.abs(active.daysLeft)} days ago${active.renews ? ` — expiry date was ${active.renews}.` : '.'}`
                : `Expiring in ${active.daysLeft} days${active.renews ? ` (${active.renews}).` : '.'}`}
            </div>

            {active.whatIsThis && (
              <>
                <div className="dp-section-label">What is this?</div>
                <p className="dp-muted">{active.whatIsThis}</p>
              </>
            )}

            <div className="dp-section-label">Details</div>
            {active.identifier && (
              <div className="dp-kv"><span className="dp-kv-key">Identifier</span><span className="dp-kv-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{active.identifier}</span></div>
            )}
            {active.renews && (
              <div className="dp-kv"><span className="dp-kv-key">Renews / expires</span><span className="dp-kv-val">{active.renews}</span></div>
            )}
            {active.cost && active.cost !== '—' && (
              <div className="dp-kv"><span className="dp-kv-key">Cost</span><span className="dp-kv-val">{active.cost}</span></div>
            )}
            {active.owner && (
              <div className="dp-kv"><span className="dp-kv-key">Owner</span><span className="dp-kv-val">{active.owner}</span></div>
            )}
            {active.notes && (
              <div className="dp-kv"><span className="dp-kv-key">Source tag</span><span className="dp-kv-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{active.notes}</span></div>
            )}
            <p className="dp-muted" style={{ marginTop: '1rem', fontSize: '0.78rem' }}>
              Source of truth: <code style={{ fontFamily: 'var(--font-mono)' }}>Infrastructure/RENEWALS.md</code>
            </p>
          </>
        )}
      </DetailPanel>
    </div>
  );
}
