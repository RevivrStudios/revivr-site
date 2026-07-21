'use client';

import { useEffect, useState } from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';

const CHANNEL_LABEL = { 'x-personal': 'Personal X', 'x-company': 'Company X', linkedin: 'LinkedIn', 'youtube-package': 'YouTube' };

export default function WeeklyScore() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marketing/social/score?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setScore)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-shimmer" style={{ marginBottom: '1.5rem' }} />;
  if (!score) return null;

  const { week, streak, watchdogs, slaFlags } = score;
  const redWatchdogs = (watchdogs || []).filter((w) => w.red);

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="approval-card-header">
        <div className="card-label"><Trophy size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />This Week</div>
        {streak > 0 && <span className="status-badge online">{streak} week streak</span>}
      </div>
      <div className="card-value" style={{ color: week.total >= week.target ? 'var(--success)' : 'var(--text-primary)' }}>
        {week.total}/{week.target}
      </div>
      <div className="card-subtitle">{week.draftedThisWeek} drafted, {week.total} published this week</div>

      <div className="approval-list" style={{ marginTop: '0.75rem' }}>
        {Object.entries(week.perChannel).filter(([, v]) => v.target > 0).map(([channel, v]) => (
          <div className="status-row" key={channel}>
            <span className="status-label">{CHANNEL_LABEL[channel] || channel}</span>
            <span className={`status-badge ${v.published >= v.target ? 'online' : 'warning'}`}>{v.published}/{v.target}</span>
          </div>
        ))}
      </div>

      {redWatchdogs.length > 0 && (
        <div className="approval-meta" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', color: 'var(--danger)' }}>
          <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
          {redWatchdogs.map((w) => CHANNEL_LABEL[w.channel] || w.channel).join(', ')}: zero drafts or posts in the last 7 days.
        </div>
      )}

      {slaFlags && slaFlags.length > 0 && (
        <div className="approval-meta" style={{ marginTop: '0.5rem', color: 'var(--danger)' }}>
          <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
          {slaFlags.length} drop(s) past the 2h drafting SLA with no draft yet: {slaFlags.map((f) => `${f.title} (${f.ageHours}h)`).join('; ')}
        </div>
      )}
    </div>
  );
}
