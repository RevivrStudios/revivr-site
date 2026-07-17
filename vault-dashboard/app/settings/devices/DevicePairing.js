'use client';

import { useState, useEffect, useRef } from 'react';
import { Smartphone, QrCode, Loader2, Copy, Check, RefreshCw, Clock, ShieldCheck } from 'lucide-react';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DevicePairing({ authEnabled, tokenLast4 }) {
  const [pairing, setPairing] = useState(null); // { url, qrDataUrl, expiresAt }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const copyTimer = useRef(null);

  // Tick once a second while a live pairing link exists, to drive the countdown.
  useEffect(() => {
    if (!pairing) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pairing]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const remaining = pairing ? pairing.expiresAt - now : 0;
  const expired = pairing && remaining <= 0;

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch('/api/auth/pair', { method: 'POST' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setPairing(data);
      setNow(Date.now());
    } catch (err) {
      setError('Could not generate a pairing code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    if (!pairing?.url) return;
    try {
      await navigator.clipboard.writeText(pairing.url);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context) — the URL is visible
      // as selectable text below regardless, so this is a no-op fallback.
    }
  }

  if (!authEnabled) {
    return (
      <div className="card" style={{ maxWidth: 620 }}>
        <p className="card-subtitle" style={{ margin: 0 }}>
          Auth is disabled on this host (no <code>DASHBOARD_TOKEN</code> set), so there is
          nothing to pair — the dashboard is already open. Set a token before exposing it
          beyond localhost.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 620 }}>
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Smartphone size={22} />
          <div>
            <div className="card-label" style={{ margin: 0 }}>Pair a new device</div>
            <div className="card-subtitle" style={{ margin: 0 }}>
              Generate a code, then scan it with the new device&rsquo;s camera. It signs in
              with zero typing and never sees the raw token.
            </div>
          </div>
        </div>

        {!pairing && (
          <button
            className="action-btn"
            onClick={generate}
            disabled={loading}
            style={{ justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                Generating…
              </>
            ) : (
              <>
                <QrCode size={16} />
                Generate pairing code
              </>
            )}
          </button>
        )}

        {error && (
          <div
            role="alert"
            style={{
              color: '#fff', background: 'var(--danger, #ff5c5c)', fontWeight: 600,
              padding: '0.6rem 0.75rem', borderRadius: 8, fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {pairing && (
          <div style={{ display: 'grid', gap: '1rem', justifyItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                position: 'relative', padding: 12, background: '#fff', borderRadius: 12,
                opacity: expired ? 0.35 : 1, transition: 'opacity 0.2s',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pairing.qrDataUrl} alt="Pairing QR code" width={240} height={240} style={{ display: 'block' }} />
            </div>

            <div style={{ width: '100%', display: 'grid', gap: '0.4rem' }}>
              <div className="card-subtitle" style={{ margin: 0 }}>
                Or open this link on the device (e.g. paste into iMessage):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code
                  style={{
                    flex: 1, minWidth: 0, overflowWrap: 'anywhere', textAlign: 'left',
                    fontSize: '0.8rem', padding: '0.5rem 0.6rem', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  }}
                >
                  {pairing.url}
                </code>
                <button
                  className="action-btn"
                  onClick={copyUrl}
                  title="Copy link"
                  style={{ flexShrink: 0, padding: '0.5rem', gap: '0.4rem' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                fontSize: '0.9rem', fontWeight: 600,
                color: expired ? 'var(--danger, #ff5c5c)' : 'var(--text-secondary, #9aa4b2)',
              }}
            >
              <Clock size={15} />
              {expired
                ? 'Expired — generate a new one'
                : `Valid ${formatRemaining(remaining)} more · one use only`}
            </div>

            <button
              className="action-btn"
              onClick={generate}
              disabled={loading}
              style={{ justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
              ) : (
                <RefreshCw size={16} />
              )}
              {expired ? 'Generate a new code' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {tokenLast4 && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={18} />
          <div className="card-subtitle" style={{ margin: 0 }}>
            If you ever type the token by hand, it should end in{' '}
            <code style={{ fontWeight: 700 }}>****{tokenLast4}</code>. The full value is never shown here.
          </div>
        </div>
      )}
    </div>
  );
}
