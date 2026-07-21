'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Share2 } from 'lucide-react';

export default function SocialScore() {
  const [score, setScore] = useState(null);

  useEffect(() => {
    fetch(`/api/marketing/social/score?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setScore)
      .catch(() => {});
  }, []);

  if (!score) return null;
  const { week } = score;
  const red = (score.watchdogs || []).some((w) => w.red) || (score.slaFlags || []).length > 0;

  return (
    <Link
      href="/marketing/social"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        borderRadius: '10px',
        border: `1px solid ${red ? 'rgba(255, 95, 88, 0.35)' : 'rgba(255, 122, 61, 0.35)'}`,
        background: red ? 'rgba(255, 95, 88, 0.06)' : 'rgba(255, 122, 61, 0.08)',
        textDecoration: 'none',
        width: 'fit-content',
      }}
    >
      <Share2 size={14} color={red ? 'var(--danger)' : 'var(--accent-orange)'} />
      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: red ? 'var(--danger)' : 'var(--text-primary)' }}>{week.total}/{week.target}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>this week{red ? ' — needs attention' : ''}</span>
    </Link>
  );
}
