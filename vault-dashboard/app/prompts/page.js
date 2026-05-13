'use client';

import { useState, useEffect } from 'react';
import { BUILD_PROMPTS, VAULT_PROMPTS } from '../data/prompts';
import { Play, Database, CheckCircle2, RotateCcw } from 'lucide-react';

function PromptCard({ prompt }) {
  const storageKey = `prompt_edit_${prompt.id}`;
  const [text, setText] = useState(prompt.text);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { setText(saved); setDirty(true); }
  }, [storageKey]);

  function handleChange(e) {
    setText(e.target.value);
    setDirty(e.target.value !== prompt.text);
    localStorage.setItem(storageKey, e.target.value);
  }

  function handleReset() {
    setText(prompt.text);
    setDirty(false);
    localStorage.removeItem(storageKey);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card prompt-card">
      <div className="prompt-header">
        <div>
          <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>{prompt.title}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-amber)', opacity: 0.7 }}>{prompt.subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {dirty && (
            <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,95,88,0.2)', background: 'rgba(255,95,88,0.06)', color: 'var(--danger)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '8px', border: copied ? '1px solid rgba(67,226,143,0.3)' : '1px solid rgba(255,179,71,0.3)', background: copied ? 'rgba(67,226,143,0.1)' : 'rgba(255,179,71,0.08)', color: copied ? 'var(--success)' : 'var(--accent-amber)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}>
            {copied ? <><CheckCircle2 size={14} /> Copied</> : 'Copy'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.6rem 0 0.85rem', lineHeight: 1.55 }}>{prompt.description}</p>
      <textarea
        value={text}
        onChange={handleChange}
        spellCheck={false}
        style={{
          width: '100%', minHeight: '200px', resize: 'vertical',
          padding: '1.1rem', background: 'rgba(5,5,6,0.85)',
          border: dirty ? '1px solid rgba(255,179,71,0.2)' : '1px solid rgba(255,255,255,0.04)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.73rem', fontFamily: 'var(--font-mono)',
          color: '#b8d4a0', lineHeight: 1.7, letterSpacing: '0.01em',
          outline: 'none', transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(255,179,71,0.25)'; }}
        onBlur={(e) => { e.target.style.borderColor = dirty ? 'rgba(255,179,71,0.2)' : 'rgba(255,255,255,0.04)'; }}
      />
      {dirty && (
        <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', marginTop: '0.45rem', opacity: 0.7 }}>
          ✎ Edited — changes saved locally
        </div>
      )}
    </div>
  );
}

export default function PromptsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Prompt Library</h1>
        <p className="subtitle">App Build Lifecycle & Vault Maintenance Commands</p>
      </div>

      <div className="section-title"><Play size={18} className="icon" /> App Build Lifecycle</div>
      <div className="prompts-grid" style={{ marginBottom: '2.5rem' }}>
        {BUILD_PROMPTS.map(p => <PromptCard key={p.id} prompt={p} />)}
      </div>

      <div className="section-title"><Database size={18} className="icon" /> Vault Maintenance</div>
      <div className="prompts-grid">
        {VAULT_PROMPTS.map(p => <PromptCard key={p.id} prompt={p} />)}
      </div>
    </div>
  );
}
