'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Check, X, Plus, Layers, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';
import MarketingTabs from '../../MarketingTabs';
import AsoInsights from './AsoInsights';

// Duplicated from app/api/marketing/_shared.js (server-only, imports `fs` —
// can't be shared into a client component). Keep in sync if the protocol's
// required-section list ever changes.
const REQUIRED_APP_SECTIONS = [
  'RAD Source',
  'About',
  'Elevator Pitch',
  'Target Audience',
  'Key Features',
  'Value Proposition',
  'Marketing Readiness (from RAD)',
  'Quell Notes',
  'Campaign Ideas',
  'Research Findings',
  'Launch Readiness',
];

function slugifyHeading(heading) {
  return 'section-' + heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isPlaceholder(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return true;
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 2) return false;
  return lines.every((l) => /^[\s\-*]*\**\s*(no .*(captured|imported)\s*yet|none (captured|yet)|needs? (rad )?(definition|confirmation|review|export)|not yet (exported|imported)).*$/i.test(l));
}

function SectionCard({ heading, content, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const placeholder = isPlaceholder(content);

  async function save() {
    setSaving(true);
    setErr(null);
    const ok = await onSave(heading, draft);
    setSaving(false);
    if (ok) setEditing(false);
    else setErr('Failed to save.');
  }

  return (
    <div className="card section-card" id={slugifyHeading(heading)}>
      <div className="section-card-header">
        <div className="card-label">{heading}</div>
        {!editing && (
          <button className="bet-icon-btn" onClick={() => { setDraft(content || ''); setEditing(true); }} title="Edit">
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            className="field-textarea"
            rows={Math.min(12, Math.max(3, draft.split('\n').length + 1))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {err && <div className="bet-error">{err}</div>}
          <div className="bet-card-actions">
            <button className="action-btn bet-save" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : <Check size={16} />} Save
            </button>
            <button className="action-btn bet-cancel" onClick={() => setEditing(false)} disabled={saving}>
              <X size={16} /> Cancel
            </button>
          </div>
        </>
      ) : (
        <div className={placeholder ? 'section-card-body placeholder' : 'section-card-body'}>
          {content || '*Needs definition.*'}
        </div>
      )}
    </div>
  );
}

export default function AppProfileDetailPage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [radLive, setRadLive] = useState(null);
  const [messagingContent, setMessagingContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messagingDraft, setMessagingDraft] = useState('');
  const [editingMessaging, setEditingMessaging] = useState(false);
  const [messagingSaving, setMessagingSaving] = useState(false);
  const [reviews, setReviews] = useState({ appStoreId: null, items: [] });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await fetch(`/api/marketing/apps/${slug}/reviews?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load reviews.');
      setReviews({ appStoreId: data.appStoreId, items: data.reviews || [] });
    } catch (err) {
      setReviewsError(err.message || 'Failed to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  }, [slug]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/apps/${slug}?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load.');
        return;
      }
      setProfile(data.profile);
      setRadLive(data.radLive || null);
      setMessagingContent(data.messagingContent);
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // The browser tries to scroll to the URL hash on navigation, but this
  // page's sections don't exist in the DOM until `profile` loads — so a
  // deep link like #section-key-features silently lands at the top instead.
  // Scroll manually once the content that owns that id has actually rendered.
  useEffect(() => {
    if (!profile || !window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [profile]);

  async function saveSection(heading, body) {
    try {
      const res = await fetch(`/api/marketing/apps/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'section', heading, body }),
      });
      if (!res.ok) return false;
      await load();
      return true;
    } catch {
      return false;
    }
  }

  async function saveMessaging() {
    setMessagingSaving(true);
    try {
      const res = await fetch(`/api/marketing/apps/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'messaging', body: messagingDraft }),
      });
      if (res.ok) {
        await load();
        setEditingMessaging(false);
      }
    } finally {
      setMessagingSaving(false);
    }
  }

  function createMessaging() {
    setMessagingDraft(`# Messaging — ${profile?.title || slug}\n\n## Positioning Statement\n\n\n## Message Pillars\n\n\n## Words to Use / Avoid\n`);
    setEditingMessaging(true);
    setMessagingContent(''); // reveal the editor immediately
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-shimmer" style={{ height: '200px' }} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="dashboard">
        <div className="card empty-state">{error || 'App not found.'}</div>
      </div>
    );
  }

  const extraSections = Object.keys(profile.sections).filter((h) => !REQUIRED_APP_SECTIONS.includes(h));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <Link href="/marketing/apps" className="approval-expand-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
          <ArrowLeft size={14} /> All apps
        </Link>
        <h1>{profile.title}</h1>
        <p className="subtitle">
          {profile.app_classification || 'unclassified'}
          {profile.platforms ? ` · ${profile.platforms}` : ''}
          {profile.status ? ` · ${profile.status}` : ''}
        </p>
        {profile.classification_rationale && (
          <p className="subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile.classification_rationale}</p>
        )}
      </div>

      <MarketingTabs />

      <div className="card empty-state" style={{ textAlign: 'left', marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div className="app-card-completeness">
          <div className="app-card-completeness-bar">
            <div className="app-card-completeness-fill" style={{ width: `${(profile.completeness.filled / profile.completeness.total) * 100}%` }} />
          </div>
          <span>{profile.completeness.filled}/{profile.completeness.total} required sections filled{profile.last_review ? ` · last reviewed ${profile.last_review}` : ''}</span>
        </div>
      </div>

      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label"><Layers size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />Live RAD Data</div>
        {radLive ? (
          <>
            <div className="status-row">
              <span className="status-label">Lifecycle</span>
              <span className={`status-badge ${radLive.lifecycle_status === 'Released' ? 'online' : 'warning'}`}>{radLive.lifecycle_status || 'unknown'}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Classification</span>
              <span className={`status-badge ${radLive.app_classification ? 'online' : 'warning'}`}>{radLive.app_classification || 'unclassified'}</span>
            </div>
            {radLive.health_status && radLive.health_status !== 'On Track' && (
              <div className="approval-meta" style={{ color: 'var(--danger)', margin: '0.5rem 0' }}>
                <AlertTriangle size={12} /> {radLive.health_status}{radLive.health_issues?.length ? `: ${radLive.health_issues.join('; ')}` : ''}
              </div>
            )}
            {radLive.next_action && <div className="card-subtitle" style={{ marginTop: '0.5rem' }}><strong>Next:</strong> {radLive.next_action}</div>}
            <Link href={`/rad/${radLive.slug}`} className="approval-expand-btn" style={{ display: 'inline-block', marginTop: '0.75rem' }}>
              Edit in RAD →
            </Link>
          </>
        ) : (
          <div className="card-subtitle">Not yet in RAD — no project record exists for this app. <Link href="/rad" style={{ color: 'var(--accent-orange)' }}>See the RAD portfolio</Link>.</div>
        )}
      </div>

      <AsoInsights slug={slug} />

      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card-header">
          <div className="card-label">
            <MessageSquare size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />App Store Reviews
          </div>
          {reviews.appStoreId && (
            <button className="bet-icon-btn" onClick={loadReviews} disabled={reviewsLoading} title="Refresh reviews">
              {reviewsLoading ? <span className="spinner" /> : <RefreshCw size={14} />}
            </button>
          )}
        </div>
        {reviewsLoading ? (
          <div className="card-subtitle">Loading reviews…</div>
        ) : reviewsError ? (
          <div className="bet-error">{reviewsError}</div>
        ) : !reviews.appStoreId ? (
          <div className="card-subtitle">
            No <code>app_store_id</code> in this app’s vault profile. Add{' '}
            <code>app_store_id: &lt;numeric Apple ID&gt;</code> to the frontmatter of{' '}
            <code>01 Apps/{profile.folderName}/app-profile.md</code> to pull recent App Store reviews here.
          </div>
        ) : reviews.items.length === 0 ? (
          <div className="card-subtitle">No public reviews yet for App Store ID {reviews.appStoreId}.</div>
        ) : (
          <div className="approval-list">
            {reviews.items.map((r, i) => (
              <div className="card" key={i} style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>{r.title || '(untitled)'}</strong>
                  <span style={{ color: 'var(--accent-orange)', whiteSpace: 'nowrap' }} title={`${r.rating} of 5`}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))}
                  </span>
                </div>
                <div className="card-subtitle" style={{ margin: '0.15rem 0' }}>
                  {r.author}{r.version ? ` · v${r.version}` : ''}{r.updated ? ` · ${new Date(r.updated).toLocaleDateString()}` : ''}
                </div>
                <div className="section-card-body">{r.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="approval-list">
        {REQUIRED_APP_SECTIONS.map((heading) => (
          <SectionCard key={heading} heading={heading} content={profile.sections[heading] || ''} onSave={saveSection} />
        ))}
      </div>

      {extraSections.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2.5rem' }}>Additional Sections</div>
          <div className="approval-list">
            {extraSections.map((heading) => (
              <div className="card section-card" key={heading}>
                <div className="card-label">{heading}</div>
                <div className="section-card-body">{profile.sections[heading]}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title" style={{ marginTop: '2.5rem' }}>Messaging</div>
      {messagingContent === null ? (
        <div className="card empty-state" style={{ textAlign: 'left', padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>No MESSAGING.md yet for this app.</div>
          <button className="action-btn" style={{ width: 'auto' }} onClick={createMessaging}>
            <Plus size={16} /> Create MESSAGING.md
          </button>
        </div>
      ) : editingMessaging ? (
        <div className="card section-card">
          <textarea
            className="field-textarea"
            rows={14}
            value={messagingDraft}
            onChange={(e) => setMessagingDraft(e.target.value)}
          />
          <div className="bet-card-actions">
            <button className="action-btn bet-save" onClick={saveMessaging} disabled={messagingSaving}>
              {messagingSaving ? <span className="spinner" /> : <Check size={16} />} Save
            </button>
            <button className="action-btn bet-cancel" onClick={() => setEditingMessaging(false)} disabled={messagingSaving}>
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="card section-card">
          <button
            className="bet-icon-btn"
            style={{ float: 'right' }}
            onClick={() => { setMessagingDraft(messagingContent); setEditingMessaging(true); }}
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <div className="section-card-body">{messagingContent}</div>
        </div>
      )}
    </div>
  );
}
