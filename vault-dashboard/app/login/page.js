'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((r) => r.json());
    if (res.success) router.push('/');
    else setError(res.error || 'Login failed');
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
        />
        {error && <div style={{ color: 'var(--danger, #ff5c5c)', fontSize: '0.85rem' }}>{error}</div>}
        <button className="action-btn" type="submit" style={{ justifyContent: 'center' }}>Sign in</button>
      </form>
    </div>
  );
}
