'use client';

import PlaceholderSection from '../components/PlaceholderSection';

const SECTIONS = [
  { title: 'Runtime Status', description: 'Live operational state and system health indicators' },
  { title: 'Recent Actions', description: 'Log of recent operations and automated tasks' },
  { title: 'Diagnostic Prompts', description: 'Prompts for system analysis and health assessment' },
  { title: 'Repair / Recovery Prompts', description: 'Prompts for self-repair and incident recovery workflows' },
  { title: 'Operating Board / Handoff Prompts', description: 'Coordination prompts for agent handoffs and session management' },
  { title: 'Config & Runbooks', description: 'Configuration references and operational runbooks' },
];

export default function QuinnPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Quinn</h1>
        <p className="subtitle">Operations, diagnostics, self-repair, and coordination</p>
      </div>

      <div className="grid-2">
        {SECTIONS.map(s => (
          <PlaceholderSection key={s.title} title={s.title} description={s.description} />
        ))}
      </div>
    </div>
  );
}
