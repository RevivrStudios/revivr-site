'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Check, X, Plus, Trash2, AlertTriangle } from 'lucide-react';

const LIFECYCLE_VALUES = [
  'Idea', 'Planning', 'In Design', 'In Development', 'Internal Testing',
  'TestFlight', 'Preparing Submission', 'In App Review', 'Approved',
  'Released', 'Patch in Progress', 'On Hold', 'Archived',
];
const CLASSIFICATION_VALUES = ['Mission App', 'Pipeline App', 'Experimental App'];
const HEALTH_VALUES = ['On Track', 'Blocked'];

function EditableField({ label, value, multiline, isList, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(isList ? (value || []).join(', ') : (value ?? ''));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const payload = isList ? draft.split(',').map((s) => s.trim()).filter(Boolean) : draft;
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) setEditing(false);
    else setErr('Failed to save.');
  }

  const displayValue = isList ? (value || []).join(', ') : (value || '');

  return (
    <div className="rad-field">
      <div className="rad-field-header">
        <span className="bet-field-label">{label}</span>
        {!editing && (
          <button
            className="bet-icon-btn"
            onClick={() => { setDraft(isList ? (value || []).join(', ') : (value ?? '')); setEditing(true); }}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {editing ? (
        <>
          {multiline ? (
            <textarea className="field-textarea" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : (
            <input className="field-input" value={draft} onChange={(e) => setDraft(e.target.value)} />
          )}
          {err && <div className="bet-error">{err}</div>}
          <div className="bet-card-actions">
            <button className="action-btn bet-save" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : <Check size={14} />} Save
            </button>
            <button className="action-btn bet-cancel" onClick={() => setEditing(false)} disabled={saving}>
              <X size={14} /> Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="rad-field-value">{displayValue || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>empty</span>}</div>
      )}
    </div>
  );
}

function CheckboxField({ label, value, onSave }) {
  const [saving, setSaving] = useState(false);
  return (
    <label className="rad-checkbox-field">
      <input
        type="checkbox"
        checked={!!value}
        disabled={saving}
        onChange={async (e) => { setSaving(true); await onSave(e.target.checked); setSaving(false); }}
      />
      {label}
    </label>
  );
}

export default function RadDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rad/${slug}?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load.');
        return;
      }
      setProject(data.project);
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const syncRegistry = useCallback(() => {
    fetch('/api/rad/registry', { method: 'POST' }).catch(() => {});
  }, []);

  async function saveField(field, value) {
    try {
      const res = await fetch(`/api/rad/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'frontmatter', field, value }),
      });
      if (!res.ok) return false;
      await load();
      if (field === 'lifecycle_status' || field === 'health_status') syncRegistry();
      return true;
    } catch {
      return false;
    }
  }

  async function setLifecycle(status) {
    await saveField('lifecycle_status', status);
  }

  async function setClassification(classification) {
    await saveField('app_classification', classification);
  }

  async function setHealth(status) {
    await saveField('health_status', status);
  }

  async function saveTasks(tasks) {
    const res = await fetch(`/api/rad/${slug}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'tasks', tasks }),
    });
    if (res.ok) await load();
  }

  async function addTask() {
    if (!newTask.trim()) return;
    const tasks = [...(project.openTasks || []), { done: false, text: newTask.trim() }];
    setNewTask('');
    await saveTasks(tasks);
  }

  async function toggleTask(index) {
    const tasks = project.openTasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    await saveTasks(tasks);
  }

  async function removeTask(index) {
    const tasks = project.openTasks.filter((_, i) => i !== index);
    await saveTasks(tasks);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/rad/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'planning-note', note: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote('');
        await load();
      }
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-shimmer" style={{ height: '200px' }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="dashboard">
        <div className="card empty-state">{error || 'Project not found.'}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <Link href="/rad" className="approval-expand-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
          <ArrowLeft size={14} /> All RAD projects
        </Link>
        <h1>{project.name}</h1>
        <p className="subtitle">
          {project.priority ? `Priority: ${project.priority}` : ''}
          {project.note ? ` · ${project.note}` : ''}
        </p>
      </div>

      {/* Classification — the first place this has ever existed */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">App Classification</div>
        {!project.app_classification && (
          <div className="approval-meta" style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>
            <AlertTriangle size={14} /> unclassified — Einar decision needed
          </div>
        )}
        <div className="bet-card-actions">
          {CLASSIFICATION_VALUES.map((c) => (
            <button
              key={c}
              className={`tab-btn ${project.app_classification === c ? 'active' : ''}`}
              onClick={() => setClassification(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <EditableField
            label="Classification Rationale"
            value={project.classification_rationale}
            multiline
            onSave={(v) => saveField('classification_rationale', v)}
          />
        </div>
      </div>

      {/* Lifecycle */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Lifecycle Status</div>
        <div className="tab-container" style={{ flexWrap: 'wrap', border: 'none', paddingBottom: 0 }}>
          {LIFECYCLE_VALUES.map((s) => (
            <button
              key={s}
              className={`tab-btn ${project.lifecycle_status === s ? 'active' : ''}`}
              onClick={() => setLifecycle(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="card-label" style={{ marginTop: '1.25rem' }}>Health Status</div>
        <div className="bet-card-actions">
          {HEALTH_VALUES.map((h) => (
            <button
              key={h}
              className={`tab-btn ${project.health_status === h ? 'active' : ''}`}
              onClick={() => setHealth(h)}
            >
              {h}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <EditableField
            label="Health Issues"
            value={project.health_issues}
            isList
            onSave={(v) => saveField('health_issues', v)}
          />
        </div>
      </div>

      {/* Next Action */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Next Action</div>
        <EditableField label="Next Action" value={project.next_action} multiline onSave={(v) => saveField('next_action', v)} />
        <EditableField label="Owner" value={project.next_action_owner} onSave={(v) => saveField('next_action_owner', v)} />
        <EditableField label="Due" value={project.next_action_due} onSave={(v) => saveField('next_action_due', v)} />
        <EditableField label="Current Milestone" value={project.current_milestone} onSave={(v) => saveField('current_milestone', v)} />
        <EditableField label="Blocker" value={project.blocker} multiline onSave={(v) => saveField('blocker', v)} />
      </div>

      {/* Release Info */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Release Info</div>
        <EditableField label="Bundle ID" value={project.bundle_id} onSave={(v) => saveField('bundle_id', v)} />
        <EditableField label="Current Build Number" value={project.current_build_number} onSave={(v) => saveField('current_build_number', v)} />
        <EditableField label="Current App Store Version" value={project.current_app_store_version} onSave={(v) => saveField('current_app_store_version', v)} />
        <EditableField label="App Store State" value={project.app_store_state} onSave={(v) => saveField('app_store_state', v)} />
        <EditableField label="Release State" value={project.release_state} onSave={(v) => saveField('release_state', v)} />
        <EditableField label="Target Launch Date" value={project.target_launch_date} onSave={(v) => saveField('target_launch_date', v)} />
        <CheckboxField label="Patch Needed" value={project.patch_needed} onSave={(v) => saveField('patch_needed', v)} />
      </div>

      {/* Repo & Platforms */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Repository &amp; Platforms</div>
        <EditableField label="Repository URL" value={project.repository_url} onSave={(v) => saveField('repository_url', v)} />
        <EditableField label="Aliases" value={project.aliases} isList onSave={(v) => saveField('aliases', v)} />
        <EditableField label="Platforms" value={project.platforms} isList onSave={(v) => saveField('platforms', v)} />
        <div className="approval-meta" style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>
          <AlertTriangle size={12} /> RAD's platforms field defaults to [iOS, iPadOS, macOS] for most projects regardless of real target — unverified unless you've confirmed it for this app.
        </div>
        <CheckboxField label="Test Project" value={project.is_test_project} onSave={(v) => saveField('is_test_project', v)} />
        <CheckboxField label="Needs Marketing Export" value={project.needs_marketing_export} onSave={(v) => saveField('needs_marketing_export', v)} />
        <EditableField label="Source Experiment ID" value={project.source_experiment_id} onSave={(v) => saveField('source_experiment_id', v)} />
      </div>

      {/* Open Tasks */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Open Tasks</div>
        {(project.openTasks || []).length === 0 ? (
          <div className="card-subtitle" style={{ marginBottom: '0.75rem' }}>No open tasks.</div>
        ) : (
          <div style={{ marginBottom: '0.75rem' }}>
            {project.openTasks.map((t, i) => (
              <div key={i} className="status-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(i)} />
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>{t.text}</span>
                </label>
                <button className="bet-icon-btn bet-icon-danger" onClick={() => removeTask(i)} title="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="field-input" placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
          <button className="action-btn" style={{ width: 'auto' }} onClick={addTask}><Plus size={14} /> Add</button>
        </div>
      </div>

      {/* Planning Notes */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Planning Notes</div>
        <div className="section-card-body" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '0.85rem' }}>
          {project.sections['Planning Notes'] || '*No planning notes recorded in RAD.*'}
        </div>
        <textarea className="field-textarea" rows={2} placeholder="Append a new dated note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
        <div className="bet-card-actions">
          <button className="action-btn bet-save" onClick={addNote} disabled={savingNote}>
            {savingNote ? <span className="spinner" /> : <Plus size={14} />} Add Note
          </button>
        </div>
      </div>

      {/* Read-only sections */}
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">About</div>
        <div className="section-card-body">{project.sections['About']}</div>
      </div>
      <div className="card section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-label">Version History</div>
        <div className="section-card-body">{project.sections['Version History']}</div>
      </div>
      <div className="card section-card">
        <div className="card-label">Marketing</div>
        <div className="section-card-body">{project.sections['Marketing']}</div>
      </div>
    </div>
  );
}
