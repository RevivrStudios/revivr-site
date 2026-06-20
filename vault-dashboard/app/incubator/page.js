'use client';

import { useState, useEffect } from 'react';
import { Beaker, Search, Edit2, Server, Save, X, Cpu, HardDrive, Trash2, FolderOpen, TerminalSquare, Copy, GitBranch, UploadCloud } from 'lucide-react';
import { copyTextToClipboard, showManualCopyDialog } from '../utils/clipboard';

export default function Incubator() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [exportStatus, setExportStatus] = useState({});

  useEffect(() => {
    fetch('/api/incubator')
      .then(res => res.json())
      .then(data => {
        setExperiments(data.experiments || []);
        setLoading(false);
      });
  }, []);

  const handleEdit = (exp) => {
    setEditingId(exp.id);
    setEditForm({ ...exp });
  };

  const handleDelete = async (filename) => {
    if (confirm('Are you sure you want to delete this experiment?')) {
      await fetch('/api/incubator/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      setExperiments(experiments.filter(e => e.filename !== filename));
    }
  };

  const handleSave = async (filename) => {
    const fields = {
      ...editForm,
      rad_candidate: editForm.rad_candidate === 'yes' || editForm.rad_candidate === 'watch' || editForm.rad_candidate === 'promoted'
        ? editForm.rad_candidate
        : 'no'
    };
    await fetch('/api/incubator/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fields })
    });
    setExperiments(experiments.map(e => e.filename === filename ? { ...e, ...fields } : e));
    setEditingId(null);
  };

  const handleExportToRAD = async (exp) => {
    if (hasSuccessfulRADExport(exp)) {
      alert(`Already exported to RAD${exp.rad_project_slug ? ` as ${exp.rad_project_slug}` : ''}.`);
      return;
    }

    if (hasQueuedRADExport(exp)) {
      alert(`RAD export is already queued: ${exp.rad_export_command_id}`);
      return;
    }

    if (exp.rad_candidate !== 'yes' && exp.rad_candidate !== 'watch') {
      alert('Only RAD candidates can be exported.');
      return;
    }

    if (!confirm(`Export "${exp.name}" to RAD?`)) return;

    setExportStatus({ ...exportStatus, [exp.filename]: 'queueing' });

    try {
      const res = await fetch('/api/incubator/export-to-rad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: exp.filename, mode: 'queue' })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'RAD export failed');
      }

      const nextStatus = data.exportStatus || 'queued';
      setExportStatus({ ...exportStatus, [exp.filename]: nextStatus });
      if (data.fields) {
        setExperiments(experiments.map(e => e.filename === exp.filename ? { ...e, ...data.fields } : e));
      }
      const fallback = data.shellCommand ? `\n\nFallback command:\n${data.shellCommand}` : '';
      alert(nextStatus === 'exported'
        ? `RAD export verified.\n\n${data.fields?.rad_project_slug || data.fields?.rad_project_id || data.commandID}`
        : `RAD import command queued.\n\n${data.queuedPath || data.commandID}${fallback}`);
    } catch (error) {
      setExportStatus({ ...exportStatus, [exp.filename]: 'error' });
      alert(`RAD export failed: ${error.message}`);
    }
  };

  const copyPrompt = async () => {
    const prompt = `[URGENT] EXPERIMENT INCUBATOR UPDATE\n\nWe need to update the Revivr Experiment Incubator.\n\nWORKSPACE RULE:\nIf this experiment references a local project, the project path must be the real external local project folder, normally:\n/Volumes/[External Drive Name]/AppleDeveloper/Xcode_Projects/[ProjectName]\n\nDo NOT record an AI sandbox, temporary checkout, hidden workspace, or copied repo as \`project_folder\`, \`repo\`, or \`git_repo\`.\n\nBefore creating or updating \`project_folder\`, \`repo\`, or \`git_repo\` fields, run and report:\npwd\ngit status --short --branch\ngit remote -v\n\nIf \`pwd\` is not inside the real external project folder, use the known external project path from the user/registry, or stop and ask.\n\n1. Locate Data: All experiment files are in the shared iCloud Obsidian vault at \`~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/Incubator\`.\n2. Read Protocol: YOU MUST read \`EXPERIMENT_AGENT_UPDATE_PROTOCOL.md\` inside that folder before taking any action.\n3. New Experiments: Copy \`TEMPLATES/EXPERIMENT_TEMPLATE.md\`. Fill out all YAML frontmatter fields exactly. For \`project_folder\`, \`repo\`, and \`git_repo\`, use only the real external project folder and its Git remote. Never use an internal AI workspace path. Save the file using the ID naming convention from the protocol, then add a formatted row to the table in \`EXPERIMENT_REGISTRY.md\`.\n4. Existing Experiments: Modify ONLY the requested YAML frontmatter fields and append new notes to the bottom. Never delete existing history.\n5. Close-out: Provide a concise confirmation detailing what fields were updated, any issues encountered, and if any data was omitted and why.\n\nTask: [REPLACE THIS WITH YOUR SPECIFIC INSTRUCTIONS FOR THE AGENT]`;
    const didCopy = await copyTextToClipboard(prompt);
    if (didCopy) {
      alert('Prompt copied to clipboard!');
    } else {
      showManualCopyDialog(prompt);
    }
  };

  const isRADCandidate = (exp) => exp.rad_candidate === 'yes' || exp.rad_candidate === 'watch';
  const hasSuccessfulRADExport = (exp) => exp.rad_export_status === 'exported' || exp.rad_candidate === 'promoted' || Boolean(exp.rad_project_id) || Boolean(exp.rad_project_slug);
  const hasQueuedRADExport = (exp) => exp.rad_export_status === 'queued' && Boolean(exp.rad_export_command_id);
  const isRiskOrUnbacked = (exp) => exp.backup === 'none' || exp.backup === 'unknown' || exp.handoff_risk === 'high';

  const matchesFilter = (exp, selectedFilter) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'rad') return isRADCandidate(exp);
    if (selectedFilter === 'blocked') return exp.status === 'blocked';
    if (selectedFilter === 'unbacked') return isRiskOrUnbacked(exp);
    if (selectedFilter === 'active') return exp.status === 'active';
    return true;
  };

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'unbacked', label: 'Risk/Unbacked' },
    { id: 'rad', label: 'RAD Candidates' },
  ].map(option => ({
    ...option,
    count: experiments.filter(exp => matchesFilter(exp, option.id)).length,
  }));

  const filtered = experiments.filter(exp => matchesFilter(exp, filter));
  const currentFilter = filterOptions.find(option => option.id === filter) || filterOptions[0];

  const copyText = async (text) => {
    if (!text || text === 'Local path not specified') return;
    const didCopy = await copyTextToClipboard(text);
    if (didCopy) {
      alert('Path copied to clipboard!');
    } else {
      showManualCopyDialog(text);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Incubator</h1>
        <p className="subtitle">Early-stage experiments & prototypes</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-surface-elevated)' }}>
        <div className="card-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TerminalSquare size={16} /> Agent Update Prompt</span>
          <button onClick={copyPrompt} className="action-btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            <Copy size={14} /> Copy to Clipboard
          </button>
        </div>
        <div style={{ background: '#09090a', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
{`[URGENT] EXPERIMENT INCUBATOR UPDATE

We need to update the Revivr Experiment Incubator.

WORKSPACE RULE:
If this experiment references a local project, the project path must be the real external local project folder, normally:
/Volumes/[External Drive Name]/AppleDeveloper/Xcode_Projects/[ProjectName]

Do NOT record an AI sandbox, temporary checkout, hidden workspace, or copied repo as \`project_folder\`, \`repo\`, or \`git_repo\`.

Before creating or updating \`project_folder\`, \`repo\`, or \`git_repo\` fields, run and report:
pwd
git status --short --branch
git remote -v

If \`pwd\` is not inside the real external project folder, use the known external project path from the user/registry, or stop and ask.

1. Locate Data: All experiment files are in the shared iCloud Obsidian vault at \`~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/Incubator\`.
2. Read Protocol: YOU MUST read \`EXPERIMENT_AGENT_UPDATE_PROTOCOL.md\` inside that folder before taking any action.
3. New Experiments: Copy \`TEMPLATES/EXPERIMENT_TEMPLATE.md\`. Fill out all YAML frontmatter fields exactly. For \`project_folder\`, \`repo\`, and \`git_repo\`, use only the real external project folder and its Git remote. Never use an internal AI workspace path. Save the file using the ID naming convention from the protocol, then add a formatted row to the table in \`EXPERIMENT_REGISTRY.md\`.
4. Existing Experiments: Modify ONLY the requested YAML frontmatter fields and append new notes to the bottom. Never delete existing history.
5. Close-out: Provide a concise confirmation detailing what fields were updated, any issues encountered, and if any data was omitted and why.

Task: [REPLACE THIS WITH YOUR SPECIFIC INSTRUCTIONS FOR THE AGENT]`}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1rem 1.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {filterOptions.map(option => (
            <button
              key={option.id}
              className="action-btn"
              style={{
                width: 'auto',
                padding: '0.5rem 1rem',
                borderColor: filter === option.id ? 'var(--accent-orange)' : '',
                background: filter === option.id ? 'rgba(255, 122, 61, 0.12)' : '',
              }}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span style={{fontFamily: 'var(--font-mono)', color: filter === option.id ? 'var(--accent-orange)' : 'var(--text-muted)'}}>
                {option.count}
              </span>
            </button>
          ))}
          <span style={{marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
            Showing {filtered.length}/{experiments.length} · {currentFilter.label}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid-3">
           <div className="loading-shimmer" />
           <div className="loading-shimmer" />
           <div className="loading-shimmer" />
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(exp => (
            <div key={exp.filename} className="card">
              {editingId === exp.id ? (
                <div>
                  <input className="edit-input" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}} placeholder="Name" />
                  <select value={editForm.status || 'idea'} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}}>
                    <option value="idea">Idea</option>
                    <option value="queued">Queued</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="blocked">Blocked</option>
                    <option value="archived">Archived</option>
                    <option value="promoted">Promoted</option>
                  </select>
                  <select value={editForm.agent || 'Other LLM'} onChange={e => setEditForm({...editForm, agent: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}}>
                    <option value="Claude">Claude</option>
                    <option value="Codex">Codex</option>
                    <option value="Antigravity">Antigravity</option>
                    <option value="Quinn">Quinn</option>
                    <option value="Other LLM">Other LLM</option>
                  </select>
                  <input className="edit-input" value={editForm.project_folder || ''} onChange={e => setEditForm({...editForm, project_folder: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}} placeholder="Local project folder path" />
                  <input className="edit-input" value={editForm.git_repo || ''} onChange={e => setEditForm({...editForm, git_repo: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}} placeholder="Git repository URL" />
                  <input className="edit-input" value={editForm.next_step || ''} onChange={e => setEditForm({...editForm, next_step: e.target.value})} style={{width: '100%', marginBottom: '1rem', background: '#222', color: '#fff', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px'}} placeholder="Next step" />
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                    <input
                      type="checkbox"
                      checked={editForm.rad_candidate === 'yes' || editForm.rad_candidate === 'watch' || editForm.rad_candidate === 'promoted'}
                      onChange={e => setEditForm({...editForm, rad_candidate: e.target.checked ? 'watch' : 'no'})}
                      style={{width: '1rem', height: '1rem', accentColor: 'var(--accent-orange)'}}
                    />
                    RAD candidate
                    <span style={{fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem'}}>
                      {editForm.rad_candidate || 'no'}
                    </span>
                  </label>
                  {(editForm.rad_export_status || editForm.rad_project_slug || editForm.rad_project_id) && (
                    <div style={{marginBottom: '1rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem'}}>
                      RAD export: {editForm.rad_export_status || 'recorded'}
                      {(editForm.rad_project_slug || editForm.rad_project_id) && ` · ${editForm.rad_project_slug || editForm.rad_project_id}`}
                    </div>
                  )}
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button onClick={() => handleSave(exp.filename)} className="action-btn" style={{padding: '0.5rem'}}><Save size={16}/> Save</button>
                    <button onClick={() => setEditingId(null)} className="action-btn danger" style={{padding: '0.5rem'}}><X size={16}/> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-label">
                    <Beaker size={16} /> {exp.id || 'N/A'}
                    <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                      {(exp.rad_candidate === 'yes' || exp.rad_candidate === 'watch') && (
                        <span style={{cursor: 'pointer'}} onClick={() => handleExportToRAD(exp)} title="Export to RAD">
                          <UploadCloud size={14} color={exportStatus[exp.filename] === 'queued' ? 'var(--success)' : 'var(--accent-orange)'}/>
                        </span>
                      )}
                      <span style={{cursor: 'pointer'}} onClick={() => handleEdit(exp)}>
                        <Edit2 size={14} color="var(--text-muted)"/>
                      </span>
                      <span style={{cursor: 'pointer'}} onClick={() => handleDelete(exp.filename)}>
                        <Trash2 size={14} color="var(--danger)"/>
                      </span>
                    </div>
                  </div>
                  <div style={{fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem'}}>{exp.name || 'Untitled'}</div>
                  
                  <div style={{marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    <div className={`status-badge ${exp.status === 'active' ? 'online' : exp.status === 'blocked' ? 'offline' : 'warning'}`}>
                      {exp.status || 'unknown'}
                    </div>
                    <div className="status-badge" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'}}>
                       <Cpu size={12}/> {exp.agent || 'None'}
                    </div>
                    <div className="status-badge" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'}}>
                       <HardDrive size={12}/> {exp.machine || 'Unknown'}
                    </div>
                    {isRADCandidate(exp) && (
                      <div className="status-badge" style={{background: 'rgba(255, 122, 61, 0.1)', color: 'var(--accent-orange)', border: '1px solid rgba(255, 122, 61, 0.25)'}}>
                        <UploadCloud size={12}/> RAD {exp.rad_candidate}
                      </div>
                    )}
                    {hasQueuedRADExport(exp) && (
                      <div className="status-badge warning">
                        RAD queued
                      </div>
                    )}
                    {hasSuccessfulRADExport(exp) && (
                      <div className="status-badge online">
                        RAD exported
                      </div>
                    )}
                  </div>

                  <div className="card-subtitle" style={{marginTop: '0', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', alignItems: 'center', wordBreak: 'break-all'}}>
                    <FolderOpen size={14} style={{flexShrink: 0}} /> 
                    <span style={{cursor: 'pointer'}} onClick={() => copyText(exp.project_folder || exp.location || exp.repo)} title="Click to copy path">
                      {exp.project_folder || exp.location || exp.repo || 'Local path not specified'}
                    </span>
                    {(exp.project_folder || exp.location || exp.repo) && (
                      <Copy size={12} style={{cursor: 'pointer', opacity: 0.5}} onClick={() => copyText(exp.project_folder || exp.location || exp.repo)} title="Copy to clipboard" />
                    )}
                  </div>
                  {(exp.git_repo || exp.repo) && (
                    <div className="card-subtitle" style={{marginTop: '0', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', alignItems: 'center', wordBreak: 'break-all'}}>
                      <GitBranch size={14} style={{flexShrink: 0}} /> 
                      <span style={{cursor: 'pointer'}} onClick={() => copyText(exp.git_repo || exp.repo)} title="Click to copy path">
                        {exp.git_repo || exp.repo}
                      </span>
                      <Copy size={12} style={{cursor: 'pointer', opacity: 0.5}} onClick={() => copyText(exp.git_repo || exp.repo)} title="Copy to clipboard" />
                    </div>
                  )}
                  
                  <div className="card-subtitle" style={{marginTop: '0', marginBottom: '1.5rem', color: 'var(--accent-amber)', fontSize: '0.85rem'}}>
                    <strong style={{color: 'var(--text-secondary)'}}>Next:</strong> {exp.next_step || 'Not defined'}
                  </div>

                  {(exp.rad_candidate === 'yes' || exp.rad_candidate === 'watch' || hasQueuedRADExport(exp) || hasSuccessfulRADExport(exp)) && (
                    <button
                      onClick={() => handleExportToRAD(exp)}
                      className="action-btn"
                      disabled={hasQueuedRADExport(exp) || hasSuccessfulRADExport(exp)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.9rem',
                        marginBottom: '1rem',
                        justifyContent: 'center',
                        opacity: hasQueuedRADExport(exp) || hasSuccessfulRADExport(exp) ? 0.55 : 1,
                        cursor: hasQueuedRADExport(exp) || hasSuccessfulRADExport(exp) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <UploadCloud size={16} />
                      {hasSuccessfulRADExport(exp) ? `Exported to RAD${exp.rad_project_slug ? `: ${exp.rad_project_slug}` : ''}` : hasQueuedRADExport(exp) || exportStatus[exp.filename] === 'queued' ? 'Queued to RAD' : exportStatus[exp.filename] === 'queueing' ? 'Queueing RAD Export' : 'Export to RAD'}
                    </button>
                  )}
                  
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)'}}>
                    <span>Touched: {exp.last_touched || 'Unknown'}</span>
                    <span style={{color: exp.backup === 'none' ? 'var(--danger)' : 'inherit'}}>Backup: {exp.backup || 'unknown'}</span>
                  </div>
                  {exportStatus[exp.filename] && (
                    <div style={{marginTop: '0.75rem', fontSize: '0.75rem', color: exportStatus[exp.filename] === 'error' ? 'var(--danger)' : 'var(--accent-amber)', fontFamily: 'var(--font-mono)'}}>
                      RAD export: {exportStatus[exp.filename]}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="card-subtitle" style={{gridColumn: '1 / -1'}}>No experiments found for this filter.</div>}
        </div>
      )}
    </div>
  );
}
