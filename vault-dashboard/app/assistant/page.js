'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Cpu, Wrench, FolderGit2, ImagePlus, X } from 'lucide-react';

// Resident operations assistant: persistent, project-aware chat threads.
// Context (registry, project state, handoff, problem tickets) is auto-loaded
// server-side — the whole point is never re-explaining a problem.

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES = 6;

let attachCounter = 0;

// Read a File into the attachment shape we keep in state: a data URL for the
// preview + the raw base64 + media_type we send to the API. Rejects with a
// human-readable reason so the composer can surface it inline.
function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      reject(new Error(`${file.name || 'image'}: unsupported type (${file.type || 'unknown'}). Use PNG, JPEG, WebP, or GIF.`));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`${file.name || 'image'}: ${(file.size / 1024 / 1024).toFixed(1)}MB is over the 5MB limit.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({
        id: `att-${Date.now()}-${attachCounter++}`,
        dataUrl,
        media_type: file.type,
        data: dataUrl.split(',')[1] || '',
        name: file.name || 'pasted-image',
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`${file.name || 'image'}: could not be read.`));
    reader.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const [threads, setThreads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [newProject, setNewProject] = useState('');
  const [sending, setSending] = useState(false);
  const [turnStatus, setTurnStatus] = useState('Working…');
  const [lastBackend, setLastBackend] = useState(null); // {backend, fallbackReason} of the most recent turn
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

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

  // Shared attachment intake for paste, drop, and the file picker.
  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter((f) => f && f.type.startsWith('image/'));
    if (files.length === 0) return;
    setError(null);
    const results = await Promise.allSettled(files.map(fileToAttachment));
    const ok = [];
    const errs = [];
    for (const r of results) {
      if (r.status === 'fulfilled') ok.push(r.value);
      else errs.push(r.reason.message);
    }
    if (errs.length) setError(errs.join(' '));
    if (ok.length) {
      setAttachments((prev) => {
        const room = MAX_IMAGES - prev.length;
        if (room <= 0) {
          setError(`You can attach at most ${MAX_IMAGES} images per message.`);
          return prev;
        }
        if (ok.length > room) setError(`Only the first ${room} image(s) were attached — ${MAX_IMAGES} max per message.`);
        return [...prev, ...ok.slice(0, room)];
      });
    }
  }, []);

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function onPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault(); // don't paste the binary as garbage text
      addFiles(files);
    }
  }

  // Prevent the browser's default "open the dropped file" navigation and wire
  // the drop into the same attachment path. Guard the highlight with a depth
  // counter so dragging over child elements doesn't flicker it off.
  function onDragEnter(e) {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }
  function onDragOver(e) {
    if (Array.from(e.dataTransfer?.types || []).includes('Files')) e.preventDefault();
  }
  function onDragLeave(e) {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  async function send() {
    const message = input.trim();
    if ((!message && attachments.length === 0) || !activeThread || sending) return;
    const threadId = activeThread.id;
    const images = attachments.map((a) => ({ media_type: a.media_type, data: a.data }));

    // Blocks form for the optimistic render + the persisted thread copy.
    const optimisticContent = images.length
      ? [
          ...(message ? [{ type: 'text', text: message }] : []),
          ...attachments.map((a) => ({ type: 'image', source: { type: 'base64', media_type: a.media_type, data: a.data } })),
        ]
      : message;

    setInput('');
    setAttachments([]);
    setSending(true);
    setError(null);
    setLastBackend(null);
    setTurnStatus('Working…');

    // optimistic render
    setActiveThread((t) => ({ ...t, messages: [...t.messages, { role: 'user', content: optimisticContent }] }));

    try {
      // Async submit: get a jobId, then poll — so a slow/queued Quinn turn never
      // blocks the request, and we can be honest about progress + which brain replied.
      const submit = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, message, images }),
      }).then((r) => r.json());
      if (!submit.success) throw new Error(submit.error);

      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 1200));
        const st = await fetch(`/api/assistant/chat/status?jobId=${encodeURIComponent(submit.jobId)}`).then((r) => r.json());
        if (!st.success) throw new Error(st.error || 'lost track of the turn');
        if (st.status === 'error') throw new Error(st.error || 'the turn failed');
        if (st.status === 'done') {
          setLastBackend({ backend: st.backend, fallbackReason: st.fallbackReason });
          await openThread(threadId);
          refreshThreads();
          break;
        }
        if (Date.now() - started > 6000) {
          setTurnStatus('Still working — your turn may be queued behind Quinn’s other work…');
        }
        if (Date.now() - started > 330000) throw new Error('timed out waiting for the reply');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function renderImages(blocks, keyPrefix) {
    const images = blocks.filter((b) => b.type === 'image' && b.source?.data);
    if (images.length === 0) return null;
    return (
      <div className="chat-images">
        {images.map((b, k) => (
          <img
            key={`${keyPrefix}-img-${k}`}
            className="chat-image"
            src={`data:${b.source.media_type};base64,${b.source.data}`}
            alt="attachment"
          />
        ))}
      </div>
    );
  }

  function renderMessage(msg, i) {
    const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const imagesEl = renderImages(blocks, i);

    if (msg.role === 'user') {
      if (!text && !imagesEl) return null; // tool_result carrier turns
      return (
        <div key={i} className="chat-msg chat-user">
          <div className="chat-bubble">
            {imagesEl}
            {text}
          </div>
        </div>
      );
    }
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
        {(text || imagesEl) && <div className="chat-bubble">{imagesEl}{text}</div>}
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
                {sending && <div className="chat-msg chat-assistant"><div className="chat-bubble chat-thinking">{turnStatus}</div></div>}
                {!sending && lastBackend?.backend === 'quinn' && (
                  <div className="chat-msg chat-assistant"><div className="chat-backend-badge">Answered by Quinn (OpenClaw · gpt-5.5)</div></div>
                )}
                {!sending && lastBackend?.backend === 'claude-fallback' && (
                  <div className="chat-msg chat-assistant"><div className="chat-backend-badge warn">⚠ Quinn was unavailable — answered by the dashboard’s Claude assistant{lastBackend.fallbackReason ? ` (${lastBackend.fallbackReason})` : ''}.</div></div>
                )}
                {error && <div className="chat-msg chat-assistant"><div className="chat-bubble chat-error">Error: {error}</div></div>}
              </div>

              {/* Composer — a drop target so Safari never navigates to a dropped image */}
              <div
                className={`assistant-composer ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                {attachments.length > 0 && (
                  <div className="assistant-attachments">
                    {attachments.map((a) => (
                      <div key={a.id} className="assistant-attachment">
                        <img src={a.dataUrl} alt={a.name} />
                        <button className="assistant-attachment-remove" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.name}`}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="assistant-input-row">
                  <button
                    className="assistant-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image"
                    type="button"
                  >
                    <ImagePlus size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    multiple
                    hidden
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                  />
                  <textarea
                    className="assistant-input"
                    rows={2}
                    placeholder="Ask anything — or paste / drop a screenshot to show me…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={onPaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                  />
                  <button className="assistant-send-btn" onClick={send} disabled={sending || (!input.trim() && attachments.length === 0)}>
                    <Send size={15} />
                  </button>
                </div>
                {dragActive && <div className="assistant-dropzone-hint"><ImagePlus size={22} /> Drop image to attach</div>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
