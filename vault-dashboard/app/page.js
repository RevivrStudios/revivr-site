'use client';

import { useEffect, useState } from 'react';
import ActiveBets from './components/ActiveBets';
import OpsHealth from './components/OpsHealth';
import ShipReviewBanner from './components/ShipReviewBanner';
import NeedsDecision from './components/NeedsDecision';
import BusinessVitals from './components/BusinessVitals';
import ReEntryLine from './components/ReEntryLine';
import SocialScore from './components/SocialScore';
import RepoHygiene from './components/RepoHygiene';
import RenewalsTile from './components/RenewalsTile';
import { CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [timestamp, setTimestamp] = useState(null);

  useEffect(() => {
    fetch(`/api/vault/health?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setTimestamp(d.timestamp || null))
      .catch(() => {});
  }, []);

  // Blocks above Attention (banner, Needs Decision, Active Bets) each fetch
  // independently and can still be resizing the page after the browser's
  // one-shot native scroll-to-#hash already fired on first paint — so a
  // deep link like /#attention (from Ship Review's Outcome Health rows)
  // can silently land short of its target. Re-assert the scroll a few
  // times while the deck settles, then stop.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    let attempts = 0;
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      attempts += 1;
      if (attempts < 5) setTimeout(tryScroll, 300);
    };
    const initial = setTimeout(tryScroll, 150);
    return () => clearTimeout(initial);
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Revivr Online Operations — Command Center</p>
        {timestamp && (
          <div className="timestamp"><CheckCircle2 size={14} color="var(--success)" /> Last synchronized: {new Date(timestamp).toLocaleString()}</div>
        )}
      </div>

      {/* Block 0 — overdue-aware Ship Review banner: absent unless due or overdue */}
      <ShipReviewBanner />

      {/* Block 1 — Needs Decision: aggregated, deep-linked judgment counts */}
      <NeedsDecision />

      {/* Business Vitals (2026-07-16): the money surface — App Store units,
          proceeds, and funnel via the asc CLI. Zero-config setup states when
          the vendor number / analytics reporting isn't connected yet. */}
      <BusinessVitals />

      {/* Social pipeline weekly score (M4, 2026-07-09) — compact, links to /marketing/social */}
      <div style={{ marginBottom: '2rem' }}>
        <SocialScore />
      </div>

      {/* Block 2 — Active Bets: the ≤3 declared bets and their next actions */}
      <ActiveBets />

      {/* Renewals due (2026-07-13): cert/subscription/domain/membership dates
          from Infrastructure/RENEWALS.md. Zero-noise — renders only when
          something is expired or within 45 days, so it sits in Attention
          alongside OpsHealth without adding a standalone page. */}
      <RenewalsTile />

      {/* Block 3 — Attention: red-only outcome-health tiles, every one actionable */}
      <OpsHealth />

      {/* Block 4 — Re-entry line: what happened while you were away */}
      <ReEntryLine />

      {/* Repo Hygiene (M7, 2026-07-09): re-mounted after the Command Deck
          Redesign's rebuild of this page silently dropped its import while
          rebuilding around the tight 5-block spec — the component and its
          API route were never broken, just orphaned. Placed last, after the
          redesign's own 5 blocks, so the deliberate above-the-fold
          minimalism stays intact; this is a "keep scrolling for more"
          addition, not a first-fold disruption. */}
      <RepoHygiene />
    </div>
  );
}
