'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { X, GitBranch } from 'lucide-react';
import DreamTeamOverview from '../components/DreamTeamOverview';

// three.js touches window/document — load the canvas client-only.
const BusinessMapCanvas = dynamic(() => import('./BusinessMapCanvas'), {
  ssr: false,
  loading: () => <div className="arch-map-loading">Loading business map…</div>,
});

export default function ArchitecturePage() {
  const [showDreamTeam, setShowDreamTeam] = useState(false);

  return (
    <div className="arch-page">
      <div className="page-header arch-page-header">
        <div>
          <h1>Architecture</h1>
          <p className="subtitle">Interactive business map — how Revivr Studios is organized</p>
        </div>
        <button className="arch-dreamteam-link" onClick={() => setShowDreamTeam(true)}>
          <GitBranch size={14} /> Dream Team pipeline
        </button>
      </div>

      <BusinessMapCanvas />

      {showDreamTeam && (
        <div className="arch-modal-backdrop" onClick={() => setShowDreamTeam(false)}>
          <div className="arch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="arch-modal-head">
              <h2>Dream Team Pipeline</h2>
              <button className="arch-modal-close" onClick={() => setShowDreamTeam(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="arch-modal-body">
              <DreamTeamOverview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
