'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // Trim before sending: copy-pasting the token from terminal grep output
      // commonly carries a trailing newline/space that silently breaks the
      // comparison with no visual cue.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      }).then((r) => r.json());
      if (res.success) {
        router.push('/');
        return; // keep the button disabled through the navigation
      }
      setError(res.error || 'Login failed');
      setSubmitting(false);
    } catch (err) {
      setError('Could not reach the server. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <form onSubmit={submit} className="card" style={{ width: 340, display: 'grid', gap: '0.8rem', textAlign: 'center' }}>
        <Lock size={28} style={{ margin: '0 auto' }} />
        <h2 style={{ margin: 0 }}>Revivr Operations</h2>
        <p className="card-subtitle">Enter the dashboard token</p>
        <input
          type="password"
          className="assistant-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Dashboard token"
          autoFocus
          disabled={submitting}
        />
        {error && (
          <div
            role="alert"
            style={{
              color: '#fff',
              background: 'var(--danger, #ff5c5c)',
              fontSize: '0.95rem',
              fontWeight: 600,
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              lineHeight: 1.35,
            }}
          >
            {error}
          </div>
        )}
        <button
          className="action-btn"
          type="submit"
          disabled={submitting}
          style={{ justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: submitting ? 0.75 : 1 }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}
