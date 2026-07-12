'use client';

import DreamTeamOverview from '../components/DreamTeamOverview';

export default function ArchitecturePage() {
  return (
    <div>
      <div className="page-header">
        <h1>Architecture</h1>
        <p className="subtitle">Dream Team Pipeline & Vault Topology</p>
      </div>

      <DreamTeamOverview />
    </div>
  );
}
