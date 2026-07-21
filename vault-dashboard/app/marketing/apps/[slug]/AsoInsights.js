'use client';

import { useEffect, useState } from 'react';
import { Search, Star, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';

function Bars({ distribution, count }) {
  return (
    <div className="aso-bars">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = distribution[star] || 0;
        const pct = count ? Math.round((n / count) * 100) : 0;
        return (
          <div className="aso-bar-row" key={star}>
            <span className="aso-bar-star">{star}★</span>
            <span className="aso-bar-track"><span className="aso-bar-fill" style={{ width: `${pct}%` }} /></span>
            <span className="aso-bar-n">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AsoInsights({ slug }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    fetch(`/api/marketing/apps/${slug}/aso?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setState({ loading: false, ...d }))
      .catch((e) => setState({ loading: false, error: e.message }));
  }, [slug]);

  const header = (
    <div className="section-card-header">
      <div className="card-label"><Search size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />ASO · Review Intelligence</div>
    </div>
  );

  if (state.loading) {
    return <div className="card section-card" style={{ marginBottom: '1.5rem' }}>{header}<div className="card-subtitle">Analyzing reviews…</div></div>;
  }
  if (state.error) {
    return <div className="card section-card" style={{ marginBottom: '1.5rem' }}>{header}<div className="bet-error">{state.error}</div></div>;
  }
  if (!state.appStoreId || !state.insights || state.insights.count === 0) {
    return (
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>{header}
        <div className="card-subtitle">
          {state.appStoreId ? 'No public reviews to analyze yet.' : 'Add an app_store_id to this app’s profile to unlock review-driven ASO insights.'}
        </div>
      </div>
    );
  }

  const ins = state.insights;
  return (
    <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
      {header}
      <div className="aso-top">
        <div className="aso-rating">
          <span className="aso-rating-num"><Star size={18} fill="currentColor" /> {ins.avgRating}</span>
          <span className="aso-rating-sub">{ins.count} recent reviews</span>
        </div>
        <Bars distribution={ins.distribution} count={ins.count} />
      </div>

      {ins.byVersion?.length > 1 && (
        <div className="aso-block">
          <div className="aso-block-label"><TrendingUp size={13} /> Rating by version</div>
          <div className="aso-versions">
            {ins.byVersion.map((v) => (
              <span key={v.version} className={`aso-ver ${v.avg >= 4 ? 'good' : v.avg <= 2.5 ? 'bad' : 'mid'}`}>
                v{v.version} · {v.avg}★ <em>({v.count})</em>
              </span>
            ))}
          </div>
        </div>
      )}

      {ins.keywordCandidates?.length > 0 && (
        <div className="aso-block">
          <div className="aso-block-label"><Search size={13} /> Keyword candidates <span className="aso-hint">— words happy users use; strong ASO seeds</span></div>
          <div className="aso-chips">
            {ins.keywordCandidates.map((k) => <span key={k} className="aso-chip kw">{k}</span>)}
          </div>
        </div>
      )}

      <div className="aso-two">
        {ins.loved?.length > 0 && (
          <div className="aso-block">
            <div className="aso-block-label"><ThumbsUp size={13} /> Loved</div>
            <div className="aso-chips">
              {ins.loved.map((t) => <span key={t.term} className="aso-chip good">{t.term} <em>{t.count}</em></span>)}
            </div>
          </div>
        )}
        {ins.painPoints?.length > 0 && (
          <div className="aso-block">
            <div className="aso-block-label"><ThumbsDown size={13} /> Pain points <span className="aso-hint">— the fix-list</span></div>
            <div className="aso-chips">
              {ins.painPoints.map((t) => <span key={t.term} className="aso-chip bad">{t.term} <em>{t.avg}★</em></span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
