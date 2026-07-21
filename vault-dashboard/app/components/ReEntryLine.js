'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';

export default function ReEntryLine() {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    fetch(`/api/command/last-activity?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setActivity(d))
      .catch(() => setActivity(null));
  }, []);

  if (!activity?.exists) return null;

  return (
    <Link
      href="/review"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        marginTop: '0.5rem',
        marginBottom: '2rem',
      }}
    >
      <History size={13} />
      Last activity: {activity.ageLabel} — {activity.agentAndProject}
      {activity.project ? ` · ${activity.project}` : ''}
    </Link>
  );
}
