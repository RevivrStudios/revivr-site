'use client';

import PlaceholderSection from '../components/PlaceholderSection';

const SECTIONS = [
  { title: 'Marketing Status', description: 'Campaign health, pipeline activity, and performance metrics' },
  { title: 'Recent Actions', description: 'Log of recent marketing operations and content generation' },
  { title: 'Campaign Prompts', description: 'Prompts for campaign planning, execution, and iteration' },
  { title: 'Positioning Prompts', description: 'Prompts for brand positioning, messaging, and competitive analysis' },
  { title: 'Launch / App Store Prompts', description: 'Prompts for App Store listings, launch sequences, and review prep' },
  { title: 'Claims & Brand Review', description: 'Compliance checks, claim verification, and brand consistency audits' },
];

export default function QuellPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Quell</h1>
        <p className="subtitle">Marketing, positioning, launch support, and public-facing strategy</p>
      </div>

      <div className="grid-2">
        {SECTIONS.map(s => (
          <PlaceholderSection key={s.title} title={s.title} description={s.description} />
        ))}
      </div>
    </div>
  );
}
