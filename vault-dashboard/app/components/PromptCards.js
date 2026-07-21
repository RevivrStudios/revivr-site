'use client';

import { useState } from 'react';

export default function PromptCards({ eyebrow, accent = 'orange', intro, prompts }) {
  const [copiedId, setCopiedId] = useState(null);

  const color = accent === 'purple' ? 'hsl(280, 70%, 70%)' : 'hsl(30, 100%, 65%)';
  const bg = accent === 'purple' ? 'hsla(280, 60%, 50%, 0.12)' : 'hsla(30, 100%, 60%, 0.1)';
  const border = accent === 'purple' ? 'hsla(280, 60%, 50%, 0.25)' : 'hsla(30, 100%, 60%, 0.2)';

  async function copyToClipboard(id, text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.prepend(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt', error);
    }
  }

  return (
    <section className="prompt-section">
      <div className="prompt-section-header">
        <div
          className="prompt-eyebrow"
          style={{ color, background: bg, borderColor: border }}
        >
          {eyebrow}
        </div>
        <div className="prompt-divider" />
      </div>

      {intro && <p className="prompt-intro">{intro}</p>}

      <div className="prompts-grid">
        {prompts.map((prompt) => (
          <article className="card prompt-card" key={prompt.id}>
            <div className="prompt-header">
              <div>
                <div className="card-label" style={{ color }}>{prompt.subtitle}</div>
                <h3 className="prompt-title">{prompt.title}</h3>
                <p className="card-subtitle prompt-description">{prompt.description}</p>
              </div>
              <button
                className="action-btn prompt-copy"
                onClick={() => copyToClipboard(prompt.id, prompt.text)}
                style={{
                  background: copiedId === prompt.id ? 'var(--success)' : bg,
                  borderColor: copiedId === prompt.id ? 'var(--success)' : border,
                  color: copiedId === prompt.id ? '#fff' : color,
                }}
              >
                {copiedId === prompt.id ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="log-output prompt-text">{prompt.text}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
