'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListChecks, ArrowRight } from 'lucide-react';

// One-line "why this is a decision, not just a number" per source. The API
// returns bare counts (+ an optional `detail`); the explanatory copy lives
// here in the presentation layer so the data route stays a pure fan-in.
const WHY = {
  approvals: 'Marketing drafts are waiting on your yes/no before they can publish.',
  blocked: 'Projects that have stalled on something only you can unblock.',
  'active-exp': 'Experiments still flagged “active” — confirm they’re live or park them.',
  health: 'Automated ops checks are failing — each needs a call on how to fix.',
  drift: 'The vault has drifted from its registry — reconcile or accept the change.',
};

export default function NeedsDecision() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`/api/command/decisions-pending?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  return (
    <div className="nd-section">
      <div className="section-title"><ListChecks size={18} className="icon" /> Needs Decision</div>
      {items.length === 0 ? (
        <div className="nd-clear">✓ No decisions waiting — you&apos;re caught up.</div>
      ) : (
        <div className="nd-grid">
          {items.map((item) => {
            const why = item.detail?.trim() ? item.detail : (WHY[item.key] || 'Needs a call from you.');
            return (
              <Link key={item.key} href={item.href} className="nd-card">
                <div className="nd-card-top">
                  <span className="nd-count">{item.count}</span>
                  <span className="nd-label">{item.label}</span>
                </div>
                <p className="nd-why">{why}</p>
                <span className="nd-go">Resolve <ArrowRight size={13} /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
