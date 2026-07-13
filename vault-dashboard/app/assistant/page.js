'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Cpu, Wrench, FolderGit2 } from 'lucide-react';

// Resident operations assistant: persistent, project-aware chat threads.
// Context (registry, project state, handoff, problem tickets) is auto-loaded
// server-side — the whole point is never re-explaining a problem.

export default function AssistantPage() {
  const [threads, setThreads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [input, setInput] = useState('');
  const [newProject, setNewProject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const refreshThreads = useCallback(async () => {
    const res = await fetch('/api/assistant/threads').then((r) => r.json());
    if (res.success) setThreads(res.threads);
  }, []);

  useEffect(() => {
    refreshThreads();
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects((d?.projects || []).map((p) => p.appName).filter(Boolean)))
      .catch(() => {});
  }, [refreshThreads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeThread?.messages?.length, sending]);

  async function openThread(id) {
    const res = await fetch(`/api/assistant/threads/${id}`).then((r) => r.json());
    if (res.success) setActiveThread(res.thread);
  }

  async function newThread() {
    const res = await fetch('/api/assistant/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: newProject || null }),
    }).then((r) => r.json());
    if (res.success) {
      setActiveThread(res.thread);
      refreshThreads();
    }
  }

  async function removeThread(id) {
    if (!confirm('Delete this conversation?')) return;
    await fetch(`/api/assistant/threads/${id}`, { method: 'DELETE' });
    if (activeThread?.id === id) setActiveThread(null);
    refreshThreads();
  }

  async function send() {
    if (!input.trim() || !activeThread || sending) return;
    const message = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    // optimistic render
    setActiveThread((t) => ({ ...t, messages: [...t.messages, { role: 'user', content: message }] }));

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread.id, message }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.error);
      await openThread(activeThread.id);
      refreshThreads();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function renderMessage(msg, i) {
    if (msg.role === 'user') {
      const text = typeof msg.content === 'string'
        ? msg.content
        : msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (!text) return null; // tool_result carrier turns
      return (
        <div key={i} className="chat-msg chat-user">
          <div className="chat-bubble">{text}</div>
        </div>
      );
    }
    const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const tools = blocks.filter((b) => b.type === 'tool_use');
    return (
      <div key={i} className="chat-msg chat-assistant">
        {tools.length > 0 && (
          <div className="chat-tools">
            {tools.map((t, j) => (
              <span key={j} className="chat-tool-chip"><Wrench size={11} /> {t.name}</span>
            ))}
          </div>
        )}
        {text && <div className="chat-bubble">{text}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Assistant</h1>
        <p className="subtitle">Resident operations AI — vault-aware, context auto-loaded, never re-explain</p>
      </div>

      <div className="assistant-layout">
        <aside className="assistant-threads card">
          <div className="assistant-new">
            <select value={newProject} onChange={(e) => setNewProject(e.target.value)} className="assistant-select">
              <option value="">No project binding</option>
              {projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="action-btn" onClick={newThread}><Plus size={14} /> New</button>
          </div>
          {threads.length === 0 && <div className="card-subtitle" style={{ padding: '0.75rem' }}>No conversations yet.</div>}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`assistant-thread-row ${activeThread?.id === t.id ? 'active' : ''}`}
              onClick={() => openThread(t.id)}
            >
              <MessageSquare size={14} />
              <div className="assistant-thread-meta">
                <div className="assistant-thread-title">{t.title}</div>
                <div className="assistant-thread-sub">
                  {t.project && <span><FolderGit2 size={10} /> {t.project} · </span>}
                  {t.messageCount} msgs
                </div>
              </div>
              <button className="assistant-thread-del" onClick={(e) => { e.stopPropagation(); removeThread(t.id); }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </aside>

        <section className="assistant-chat card">
          {!activeThread ? (
            <div className="assistant-empty">
              <Cpu size={40} strokeWidth={1.2} />
              <p>Start or open a conversation. Bind it to a project and the assistant pre-loads that app&apos;s registry entry, state file, and latest handoff before your first message.</p>
            </div>
          ) : (
            <>
              <div className="assistant-chat-header">
                <strong>{activeThread.title}</strong>
                {activeThread.project && <span className="chat-tool-chip"><FolderGit2 size={11} /> {activeThread.project}</span>}
                {activeThread.problemId && <span className="chat-tool-chip">{activeThread.problemId}</span>}
              </div>
              <div className="assistant-messages" ref={scrollRef}>
                {activeThread.messages.map(renderMessage)}
                {sending && <div className="chat-msg chat-assistant"><div className="chat-bubble chat-thinking">Working…</div></div>}
                {error && <div className="chat-msg chat-assistant"><div className="chat-bubble chat-error">Error: {error}</div></div>}
              </div>
              <div className="assistant-input-row">
                <textarea
                  className="assistant-input"
                  rows={2}
                  placeholder="Ask about any project, problem, or vault knowledge…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                />
                <button className="assistant-send-btn" onClick={send} disabled={sending || !input.trim()}>
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
