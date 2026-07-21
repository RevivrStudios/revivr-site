'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ShipReviewBanner() {
  const [agenda, setAgenda] = useState(null);

  useEffect(() => {
    fetch(`/api/review/agenda?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setAgenda(d))
      .catch(() => setAgenda(null));
  }, []);

  if (!agenda) return null;

  const { dueForReview, overdue, weeksOverdue, nextSteps } = agenda;
  const stepCount = nextSteps?.length || 0;

  // Overdue (any day) beats the Fri–Sun "open" window — a missed ritual
  // must never go silent just because today isn't the usual review day.
  if (!dueForReview && !overdue) return null;

  const isHardOverdue = overdue && !dueForReview; // stale on a non-Fri–Sun day
  const overdueLabel = weeksOverdue === null
    ? 'Ship Review has never been completed'
    : weeksOverdue >= 1
      ? `Ship Review is ${weeksOverdue} week${weeksOverdue === 1 ? '' : 's'} overdue`
      : 'Ship Review is overdue';

  return (
    <div className="card" style={{
      marginBottom: '1.5rem',
      padding: '1.1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
      borderColor: isHardOverdue ? 'rgba(255, 59, 48, 0.45)' : 'rgba(255, 79, 139, 0.35)',
      background: isHardOverdue ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 79, 139, 0.06)',
    }}>
      {isHardOverdue ? (
        <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
      ) : (
        <ClipboardCheck size={20} color="var(--success)" style={{ flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{ fontWeight: 800, color: isHardOverdue ? 'var(--danger)' : 'var(--text-primary)', fontSize: '0.95rem' }}>
          {isHardOverdue
            ? `${overdueLabel} — ${stepCount} next-step${stepCount === 1 ? '' : 's'} unverified.`
            : "This week's Ship Review is open."}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          {isHardOverdue
            ? 'Run it now — 30 minutes. Verify next-steps, note what happened, set next week’s NOW.'
            : '30 minutes, Friday–Sunday. Verify last week’s next-steps, note what happened, set next week’s NOW.'}
        </div>
      </div>
      <Link
        href="/review"
        className="action-btn"
        style={{
          width: 'auto',
          padding: '0.65rem 1.25rem',
          borderColor: isHardOverdue ? 'var(--danger)' : 'var(--success)',
          color: isHardOverdue ? 'var(--danger)' : 'var(--success)',
        }}
      >
        Open Ship Review <ArrowRight size={16} />
      </Link>
    </div>
  );
}
