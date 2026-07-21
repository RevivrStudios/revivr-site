'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, ChevronDown, ChevronRight } from 'lucide-react';
import QuinnActionButton from './QuinnActionButton';

const STATE_META = {
  ok: { label: 'OK', color: 'var(--success)' },
  stale: { label: 'STALE', color: 'var(--danger)' },
  missing: { label: 'MISSING', color: 'var(--danger)' },
  error: { label: 'ERROR', color: 'var(--danger)' },
};

const STATE_RANK = { stale: 0, missing: 0, error: 0, ok: 1 };

// One plain-English line explaining WHY a red check matters, pulled from the
// real rule that fired rather than generic filler. The remediation `cause`
// (from health-manifest.json) is the most specific source; otherwise we lean
// on the check's own detail, which already carries the actual threshold
// (e.g. "Last written 121h ago (limit 120h)").
function whyItMatters(check) {
  if (check.fix?.cause && check.fix.cause !== 'No fix metadata configured for this check yet.') {
    return check.fix.cause;
  }
  const d = check.detail ? `${check.detail}. ` : '';
  switch (check.state) {
    case 'stale':
      return `${d}Its normal refresh cadence has lapsed — whatever it produces may be going stale or getting missed.`;
    case 'missing':
      return `${d}The job that should produce this output hasn't run, so this signal is currently blind.`;
    case 'error':
      return `${d}This check couldn't complete, so its real status is unknown until it runs clean again.`;
    default:
      return null;
  }
}

function execCommandCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'absolute';
  textArea.style.left = '-999999px';
  document.body.prepend(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Permission denied or unavailable (some embedded/automated contexts) —
      // fall through to the manual-selection fallback rather than leaving
      // the button silently doing nothing.
    }
  }
  execCommandCopy(text);
}

function CopyCommand({ command }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
      <code
        style={{
          flex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          background: 'rgba(0,0,0,0.3)',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          overflowX: 'auto',
          whiteSpace: 'pre',
          color: 'var(--text-primary)',
        }}
      >
        {command}
      </code>
      <button
        className="approval-expand-btn"
        style={{ flexShrink: 0 }}
        onClick={async (e) => {
          e.stopPropagation();
          await copyText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function RemediationBody({ fix }) {
  return (
    <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
      {fix.watches && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Watches:</strong> {fix.watches}
        </div>
      )}
      {fix.cause && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Why:</strong> {fix.cause}
        </div>
      )}
      {fix.steps && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Next step:</strong> {fix.steps}
        </div>
      )}
      {fix.command && <CopyCommand command={fix.command} />}
      {Array.isArray(fix.items) && fix.items.map((item) => (
        <div key={item.label} style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            {item.label} <span style={{ color: 'var(--danger)', fontWeight: 400 }}>(exit {item.exitCode})</span>
          </div>
          <CopyCommand command={item.command} />
        </div>
      ))}
    </div>
  );
}

function HealthTile({ check }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATE_META[check.state] || STATE_META.error;
  const fix = check.fix;
  const why = whyItMatters(check);

  const cardStyle = {
    borderColor: 'rgba(255, 95, 88, 0.35)',
    background: 'rgba(255, 95, 88, 0.04)',
  };

  const quinnBtn = (
    <QuinnActionButton
      kind="health-check"
      label="Ask Quinn to fix"
      context={{ name: check.name, detail: check.detail, state: check.state, fixHint: fix?.cause || fix?.steps || null }}
    />
  );

  // Fix lives on the site — a direct link, plus the one-click Quinn action.
  if (fix?.type === 'link') {
    return (
      <div className="card health-tile" style={cardStyle}>
        <div className="card-label" style={{ color: meta.color }}>{meta.label}</div>
        <div className="health-tile-name">{check.name}</div>
        <div className="health-tile-detail">{check.detail}</div>
        {why && <div className="health-tile-why">{why}</div>}
        <div className="health-tile-footer">
          <Link href={fix.href} className="health-tile-fixlink">Fix this →</Link>
          {quinnBtn}
        </div>
      </div>
    );
  }

  // Fix lives off-site — expand into a remediation card with the exact steps/command.
  return (
    <div className="card health-tile" style={{ ...cardStyle, cursor: fix ? 'pointer' : 'default' }} onClick={() => setExpanded((e) => !e)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card-label" style={{ color: meta.color }}>{meta.label}</div>
        {expanded ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
      </div>
      <div className="health-tile-name">{check.name}</div>
      <div className="health-tile-detail">{check.detail}</div>
      {why && <div className="health-tile-why">{why}</div>}
      {!expanded && <div className="health-tile-fixlink">How to fix →</div>}
      {expanded && <RemediationBody fix={fix} />}
      <div className="health-tile-footer" onClick={(e) => e.stopPropagation()}>
        {quinnBtn}
      </div>
    </div>
  );
}

export default function OpsHealth() {
  const [checks, setChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOk, setShowOk] = useState(false);

  useEffect(() => {
    fetch(`/api/ops/health?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setChecks(d.checks || []))
      .catch(() => setChecks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div id="attention" style={{ marginBottom: '2.5rem' }}>
        <div className="section-title"><HeartPulse size={18} className="icon" /> Attention</div>
        <div className="grid-3">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      </div>
    );
  }

  if (!checks || checks.length === 0) return null;

  const sorted = [...checks].sort((a, b) => (STATE_RANK[a.state] ?? 1) - (STATE_RANK[b.state] ?? 1));
  const red = sorted.filter((c) => (STATE_RANK[c.state] ?? 1) === 0);
  const ok = sorted.filter((c) => (STATE_RANK[c.state] ?? 1) === 1);

  if (red.length === 0) {
    return (
      <div id="attention" style={{ marginBottom: '2.5rem' }}>
        <div className="section-title"><HeartPulse size={18} className="icon" /> Attention</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>✓ All {ok.length} checks OK.</div>
      </div>
    );
  }

  return (
    <div id="attention" style={{ marginBottom: '2.5rem' }}>
      <div className="section-title">
        <HeartPulse size={18} className="icon" /> Attention
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', marginLeft: '0.5rem' }}>
          {red.length} need attention
        </span>
      </div>
      <div className="grid-3">
        {red.map((check) => <HealthTile key={check.name} check={check} />)}
      </div>
      {ok.length > 0 && (
        <button
          onClick={() => setShowOk((s) => !s)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', padding: 0,
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          {showOk ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {ok.length} checks OK
        </button>
      )}
      {showOk && (
        <div className="grid-3" style={{ marginTop: '0.75rem' }}>
          {ok.map((check) => (
            <div className="card health-tile" key={check.name}>
              <div className="card-label" style={{ color: STATE_META.ok.color }}>OK</div>
              <div className="health-tile-name">{check.name}</div>
              <div className="health-tile-detail">{check.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
