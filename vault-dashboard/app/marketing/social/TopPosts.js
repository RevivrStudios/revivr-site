'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, RefreshCw, Heart, Repeat2, MessageCircle, Eye, ExternalLink } from 'lucide-react';

function Metric({ icon: Icon, value }) {
  if (value == null) return null;
  return <span className="tp-metric"><Icon size={12} /> {Number(value).toLocaleString()}</span>;
}

export default function TopPosts() {
  const [data, setData] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const d = await fetch(`/api/marketing/social/performance?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    setData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      const d = await fetch('/api/marketing/social/performance/sync', { method: 'POST' }).then((r) => r.json());
      if (d.status === 'error') setError(d.error);
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const Header = (
    <div className="section-title" style={{ marginBottom: '1rem' }}>
      <Trophy size={18} className="icon" /> What landed — do more of this
      {data?.summary && <span className="tp-synced">{data.summary.counted} posts · avg {data.summary.avgScore}</span>}
      <button className="bv-sync-btn" onClick={sync} disabled={syncing}>
        <RefreshCw size={13} className={syncing ? 'spin' : ''} /> {syncing ? 'Scoring…' : 'Sync performance'}
      </button>
    </div>
  );

  if (!data) return <div className="tp-section">{Header}<div className="loading-shimmer" style={{ height: 70 }} /></div>;

  if (data.status === 'no-token') {
    return (
      <div className="tp-section">{Header}
        <div className="bv-card">
          <p className="bv-card-body">Add <code>X_BEARER_TOKEN</code> to <code>~/.revivr/social.env</code> to pull post performance (likes, reposts, impressions) and rank what worked. Read-only — never used for posting.</p>
        </div>
      </div>
    );
  }

  if (data.status === 'unsynced' || !data.posts?.length) {
    return (
      <div className="tp-section">{Header}
        <div className="bv-card">
          <p className="bv-card-body">No performance pulled yet. Hit <strong>Sync performance</strong> to score your published X posts and surface the ones that actually landed — so the golden set learns from wins, not just cadence.</p>
          {error && <div className="bv-card-error">{error}</div>}
        </div>
      </div>
    );
  }

  const top = data.posts.filter((p) => p.metrics).slice(0, 6);

  return (
    <div className="tp-section">{Header}
      {data.summary?.weekPosts > 0 && (
        <div className="tp-week">This week: <strong>{data.summary.weekEngagement.toLocaleString()}</strong> engagement across {data.summary.weekPosts} post{data.summary.weekPosts === 1 ? '' : 's'}.</div>
      )}
      <div className="tp-list">
        {top.map((p, i) => (
          <div key={p.tweetId} className="tp-row">
            <span className="tp-rank">{i + 1}</span>
            <div className="tp-main">
              <div className="tp-text">{p.text || p.what}</div>
              <div className="tp-metrics">
                <Metric icon={Heart} value={p.metrics.like_count} />
                <Metric icon={Repeat2} value={p.metrics.retweet_count} />
                <Metric icon={MessageCircle} value={p.metrics.reply_count} />
                <Metric icon={Eye} value={p.metrics.impression_count} />
                <span className="tp-date">{p.date}</span>
              </div>
            </div>
            <div className="tp-score-wrap">
              <span className="tp-score">{p.score}</span>
              {p.link && <a className="tp-link" href={p.link} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a>}
            </div>
          </div>
        ))}
      </div>
      {error && <div className="bv-card-error" style={{ marginTop: '0.6rem' }}>{error}</div>}
    </div>
  );
}
