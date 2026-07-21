'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Check, X, Clock3, GitBranch, HeartPulse, Target, ArrowRight } from 'lucide-react';

const VERDICT_META = {
  done: { label: 'Done', color: 'var(--success)' },
  dropped: { label: 'Dropped', color: 'var(--text-muted)' },
  carried: { label: 'Carried', color: 'var(--accent-amber)' },
};

export default function ShipReview() {
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verdicts, setVerdicts] = useState({});
  const [retro, setRetro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/review/agenda?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setAgenda)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setVerdict = (id, verdict) => setVerdicts((prev) => ({ ...prev, [id]: verdict }));

  const nextSteps = agenda?.nextSteps || [];
  const allDecided = nextSteps.length === 0 || nextSteps.every((s) => verdicts[s.id]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        verdicts: nextSteps.map((s) => ({ text: `${s.project} — ${s.text}`, verdict: verdicts[s.id] })),
        retro: retro.trim(),
      };
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save review.');
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Ship Review</h1>
          <p className="subtitle">Loading this week&apos;s agenda…</p>
        </div>
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div className="page-header">
          <h1>Ship Review</h1>
          <p className="subtitle">Week of {result.weekOf} — recorded.</p>
        </div>
        <div className="card empty-state" style={{ textAlign: 'left', padding: '1.75rem' }}>
          <div style={{ fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>
            ✅ WEEKLY.md updated.
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {nextSteps.length} next-step{nextSteps.length === 1 ? '' : 's'} verdicted, retro recorded. This week&apos;s
            review banner will clear on your next visit home.
          </div>
          <Link href="/" className="action-btn" style={{ width: 'auto', padding: '0.75rem 1.5rem', display: 'inline-flex' }}>
            Back to Home <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ship Review</h1>
        <p className="subtitle">
          The Friday closure ritual — verify last week&apos;s next-steps, note what happened, set next week&apos;s NOW.
        </p>
        {agenda?.lastWeeklyDate && (
          <div className="timestamp">Last review: {agenda.lastWeeklyDate}</div>
        )}
      </div>

      {error && (
        <div className="bet-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* ── Next-step verdicts ─────────────────── */}
      <div className="section-title"><Clock3 size={18} className="icon" /> Next-Step Verdicts ({nextSteps.length})</div>
      {nextSteps.length === 0 ? (
        <div className="card empty-state" style={{ marginBottom: '2rem' }}>
          No outstanding next-steps since {agenda?.sinceDate}. Either it&apos;s been quiet, or the log parser missed
          something — worth a manual glance at Handoff_Log if that seems wrong.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {nextSteps.map((step) => (
            <div className="card" key={step.id} style={{ padding: '1.1rem 1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    {step.entryDate} · {step.project} · {step.agent}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{step.text}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignSelf: 'flex-start' }}>
                  {Object.entries(VERDICT_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setVerdict(step.id, key)}
                      className="action-btn"
                      style={{
                        width: 'auto', padding: '0.45rem 0.8rem', fontSize: '0.78rem',
                        color: verdicts[step.id] === key ? meta.color : 'var(--text-secondary)',
                        borderColor: verdicts[step.id] === key ? meta.color : undefined,
                        background: verdicts[step.id] === key ? 'rgba(255,255,255,0.06)' : undefined,
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Repo hygiene ───────────────────────── */}
      {agenda?.repoHygiene?.length > 0 && (
        <>
          <div className="section-title"><GitBranch size={18} className="icon" /> Repo Hygiene (Active Bets)</div>
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            {agenda.repoHygiene.map((r) => (
              <div className="card" key={r.title}>
                <div className="card-label">{r.title}</div>
                {r.state === 'ok' ? (
                  <>
                    <div className="card-value" style={{ fontSize: '1.8rem', color: r.dirtyFiles > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {r.dirtyFiles}
                    </div>
                    <div className="card-subtitle">dirty files · last commit {r.lastCommit}</div>
                  </>
                ) : (
                  <div className="card-subtitle" style={{ color: 'var(--text-muted)' }}>{r.detail}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Status summary + health reds ──────── */}
      <div className="grid-2" style={{ marginBottom: '0.5rem' }}>
        <Link href="/incubator" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="card-label"><Target size={14} /> Incubator Status</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            Active {agenda?.statusSummary?.active ?? '—'} · Parked {agenda?.statusSummary?.parked ?? '—'} · Killed{' '}
            {agenda?.statusSummary?.killed ?? '—'} · Shipped {agenda?.statusSummary?.shipped ?? '—'}
          </div>
        </Link>
        <div className="card">
          <div className="card-label" style={{ color: agenda?.healthReds?.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <HeartPulse size={14} /> Outcome Health
          </div>
          {agenda?.healthReds?.length > 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {agenda.healthReds.map((h) => (
                <Link key={h.name} href="/#attention" style={{ display: 'block', color: 'inherit', textDecoration: 'none', marginBottom: '0.2rem' }}>
                  ⚠️ {h.name} — {h.detail}
                </Link>
              ))}
            </div>
          ) : (
            <div className="card-subtitle">Everything checked is OK.</div>
          )}
        </div>
      </div>

      {/* ── Retro ──────────────────────────────── */}
      <div className="section-title" style={{ marginTop: '2rem' }}>Retro (5 lines max)</div>
      <textarea
        className="field-textarea"
        rows={5}
        value={retro}
        onChange={(e) => setRetro(e.target.value)}
        placeholder="What actually happened this week — the honest version."
        style={{ width: '100%', marginBottom: '2rem' }}
      />

      {/* ── Next week's NOW ────────────────────── */}
      <div className="section-title">Next Week&apos;s NOW</div>
      <div className="card" style={{ marginBottom: '2rem' }}>
        {agenda?.nowBets?.length > 0 ? (
          agenda.nowBets.map((b) => (
            <div key={b.title} style={{ marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{b.title}</strong> — {b.next_action || 'no next action set'}
            </div>
          ))
        ) : (
          <div className="card-subtitle">No active bets declared.</div>
        )}
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', marginTop: '0.5rem', display: 'inline-block' }}>
          Edit on Home →
        </Link>
      </div>

      <button
        className="action-btn"
        onClick={submit}
        disabled={!allDecided || submitting}
        style={{
          width: 'auto', padding: '0.85rem 1.75rem', marginBottom: '3rem',
          opacity: !allDecided || submitting ? 0.5 : 1,
          cursor: !allDecided || submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? <span className="spinner" /> : <Check size={16} />}
        {allDecided ? 'Submit This Week\'s Review' : 'Verdict every next-step to submit'}
      </button>
    </div>
  );
}
