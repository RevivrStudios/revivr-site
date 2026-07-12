'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Star, RefreshCw, Trash2, Megaphone, AppWindow, TerminalSquare } from 'lucide-react';
import Link from 'next/link';

const APP_STATUSES = ['live', 'beta', 'development', 'retired'];
const CAMPAIGN_STATUSES = ['idea', 'planned', 'in-progress', 'shipped', 'dropped'];
const STATUS_COLORS = {
  live: 'var(--success, #3ddc84)', beta: 'var(--warning, #ffb020)',
  development: '#5cc4ff', retired: '#888',
  idea: '#888', planned: '#5cc4ff', 'in-progress': 'var(--warning, #ffb020)',
  shipped: 'var(--success, #3ddc84)', dropped: '#666',
};

export default function QuellPage() {
  const [apps, setApps] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [reviews, setReviews] = useState(null);
  const [reviewsFor, setReviewsFor] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const [showCampForm, setShowCampForm] = useState(false);
  const [appForm, setAppForm] = useState({ name: '', appStoreId: '', status: 'development', url: '', notes: '' });
  const [campForm, setCampForm] = useState({ title: '', app: '', channel: '', status: 'idea', target_date: '', body: '' });

  const load = useCallback(async () => {
    const [a, c] = await Promise.allSettled([
      fetch('/api/marketing/apps').then((r) => r.json()),
      fetch('/api/marketing/campaigns').then((r) => r.json()),
    ]);
    if (a.status === 'fulfilled' && a.value.success) setApps(a.value.apps);
    if (c.status === 'fulfilled' && c.value.success) setCampaigns(c.value.campaigns);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveApp() {
    if (!appForm.name.trim()) return;
    await fetch('/api/marketing/apps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appForm),
    });
    setAppForm({ name: '', appStoreId: '', status: 'development', url: '', notes: '' });
    setShowAppForm(false);
    load();
  }

  async function removeApp(id) {
    if (!confirm('Remove this app from the portfolio?')) return;
    await fetch('/api/marketing/apps', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  async function loadReviews(app) {
    setReviewsFor(app);
    setReviews(null);
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/marketing/reviews?appStoreId=${app.appStoreId}`).then((r) => r.json());
      setReviews(res);
    } catch (err) {
      setReviews({ success: false, error: err.message });
    } finally {
      setReviewsLoading(false);
    }
  }

  async function saveCampaign() {
    if (!campForm.title.trim()) return;
    await fetch('/api/marketing/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campForm),
    });
    setCampForm({ title: '', app: '', channel: '', status: 'idea', target_date: '', body: '' });
    setShowCampForm(false);
    load();
  }

  async function setCampaignStatus(id, status) {
    await fetch('/api/marketing/campaigns', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Quell</h1>
        <p className="subtitle">Marketing operations — portfolio, App Store reviews, launch pipeline</p>
      </div>

      <div className="section-title"><AppWindow size={18} className="icon" /> App Portfolio</div>
      <div style={{ marginBottom: '0.8rem' }}>
        <button className="action-btn" onClick={() => setShowAppForm(!showAppForm)}><Plus size={14} /> Add app</button>
      </div>
      {showAppForm && (
        <div className="card" style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input className="assistant-input" placeholder="App name" value={appForm.name}
              onChange={(e) => setAppForm({ ...appForm, name: e.target.value })} />
            <input className="assistant-input" placeholder="App Store ID (numbers only)" value={appForm.appStoreId}
              onChange={(e) => setAppForm({ ...appForm, appStoreId: e.target.value })} />
            <select className="assistant-select" value={appForm.status} onChange={(e) => setAppForm({ ...appForm, status: e.target.value })}>
              {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input className="assistant-input" placeholder="Marketing page URL (optional)" value={appForm.url}
            onChange={(e) => setAppForm({ ...appForm, url: e.target.value })} />
          <div><button className="action-btn" onClick={saveApp}>Save</button></div>
        </div>
      )}
      {apps.length === 0 && <div className="card" style={{ marginBottom: '1.5rem' }}><div className="card-subtitle">No apps yet. Add each Revivr app; a numeric App Store ID enables review monitoring below.</div></div>}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        {apps.map((app) => (
          <div key={app.id} className="card" style={{ borderLeft: `3px solid ${STATUS_COLORS[app.status]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong>{app.name}</strong>
              <span className="chat-tool-chip">{app.status}</span>
              <button className="assistant-thread-del" style={{ marginLeft: 'auto' }} onClick={() => removeApp(app.id)}><Trash2 size={13} /></button>
            </div>
            <div className="card-subtitle" style={{ marginTop: '0.3rem' }}>
              {app.appStoreId ? `ASC ID ${app.appStoreId}` : 'No App Store ID'}{app.launchDate ? ` · launched ${app.launchDate}` : ''}
            </div>
            {app.appStoreId && (
              <button className="action-btn" style={{ marginTop: '0.6rem' }} onClick={() => loadReviews(app)}>
                <Star size={13} /> Reviews
              </button>
            )}
          </div>
        ))}
      </div>

      {reviewsFor && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-label">
            <Star size={15} /> Recent reviews — {reviewsFor.name}
            {reviews?.averageRecent != null && <span className="chat-tool-chip">avg {reviews.averageRecent}★ (last {reviews.count})</span>}
          </div>
          {reviewsLoading && <div className="loading-shimmer" style={{ height: 50 }} />}
          {reviews && !reviews.success && <div className="card-subtitle">Could not fetch reviews: {reviews.error}</div>}
          {reviews?.success && reviews.reviews.length === 0 && <div className="card-subtitle">No reviews on this storefront yet.</div>}
          {reviews?.success && reviews.reviews.map((r, i) => (
            <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--warning, #ffb020)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <strong style={{ fontSize: '0.88rem' }}>{r.title}</strong>
                <span className="card-subtitle">v{r.version} · {r.author}</span>
              </div>
              <div style={{ fontSize: '0.84rem', opacity: 0.8, marginTop: '0.2rem' }}>{r.content}</div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title"><Megaphone size={18} className="icon" /> Launch & Campaign Pipeline</div>
      <div style={{ marginBottom: '0.8rem' }}>
        <button className="action-btn" onClick={() => setShowCampForm(!showCampForm)}><Plus size={14} /> New campaign</button>
      </div>
      {showCampForm && (
        <div className="card" style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
          <input className="assistant-input" placeholder="Campaign / launch title" value={campForm.title}
            onChange={(e) => setCampForm({ ...campForm, title: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select className="assistant-select" value={campForm.app} onChange={(e) => setCampForm({ ...campForm, app: e.target.value })}>
              <option value="">Any app / studio-wide</option>
              {apps.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <input className="assistant-input" placeholder="Channel (App Store, X, Reddit, PR…)" value={campForm.channel}
              onChange={(e) => setCampForm({ ...campForm, channel: e.target.value })} />
            <input className="assistant-input" type="date" value={campForm.target_date}
              onChange={(e) => setCampForm({ ...campForm, target_date: e.target.value })} />
          </div>
          <textarea className="assistant-input" rows={3} placeholder="Goal, message, assets needed…" value={campForm.body}
            onChange={(e) => setCampForm({ ...campForm, body: e.target.value })} />
          <div><button className="action-btn" onClick={saveCampaign}>Create</button></div>
        </div>
      )}
      {campaigns.length === 0 && <div className="card" style={{ marginBottom: '2rem' }}><div className="card-subtitle">No campaigns yet — track launches, ASO passes, and content pushes here.</div></div>}
      <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '2rem' }}>
        {campaigns.map((c) => (
          <div key={c.id} className="card" style={{ borderLeft: `3px solid ${STATUS_COLORS[c.status] || '#888'}` }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Sparkles size={14} />
              <strong>{c.title}</strong>
              {c.app && <span className="chat-tool-chip">{c.app}</span>}
              {c.channel && <span className="chat-tool-chip">{c.channel}</span>}
              {c.target_date && <span className="card-subtitle">target {c.target_date}</span>}
              <select className="assistant-select" style={{ marginLeft: 'auto', flex: 'none' }} value={c.status}
                onChange={(e) => setCampaignStatus(c.id, e.target.value)}>
                {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {c.body?.trim() && <div style={{ fontSize: '0.84rem', opacity: 0.75, marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>{c.body.trim().slice(0, 400)}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-label"><TerminalSquare size={15} /> Marketing prompts</div>
        <p className="card-subtitle">
          Campaign, positioning, and App Store listing prompts live in the <Link href="/prompts" style={{ color: 'var(--accent, #00d2ff)' }}>Prompt Library</Link>.
          For ad-hoc marketing work with full portfolio context, use the <Link href="/assistant" style={{ color: 'var(--accent, #00d2ff)' }}>Assistant</Link>.
        </p>
      </div>
    </div>
  );
}
