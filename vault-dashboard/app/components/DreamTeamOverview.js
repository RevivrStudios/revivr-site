'use client';

import { useState } from 'react';

// Four actors across two memory planes. `tone` drives the accent colour.
const AGENTS = [
  { id: 'builders', label: 'Builders', sub: 'Claude / Codex', icon: '🛠️', tone: 'amber', plane: 'build',
    blurb: 'Write code, PRDs, and raw extraction dumps. Blocked from synthesized memory so RAG stays clean.' },
  { id: 'gatekeeper', label: 'Gatekeeper', sub: 'Gemini · Antigravity', icon: '🧠', tone: 'magenta', plane: 'build',
    blurb: 'ETL synthesis — turns staged dumps into structured memory and syncs the vector RAG.' },
  { id: 'quinn', label: 'Quinn', sub: 'Operations · gpt‑5.5', icon: '⚙️', tone: 'amber', plane: 'ops',
    blurb: 'Runs operations. Reads the build knowledge; writes ONLY its own OpenClaw memory + this dashboard — never rewrites VisionAppDev.' },
  { id: 'quell', label: 'Quell', sub: 'Marketing · Gemini/Fable', icon: '📣', tone: 'magenta', plane: 'ops',
    blurb: 'Runs marketing. Writes the Revivr Marketing vault; positions every app.' },
];

const PLANES = [
  {
    id: 'build', label: 'Build Memory', sub: 'VisionAppDev — the Dream Team RAG',
    layers: [
      { id: 'l1', name: 'Layer 1 · Core Directives', sub: 'The Brainstem',
        contents: ['visionOS_Playbook.md', 'Agent_Succession_Protocol.md', 'Dream_Team_Agentic_SOP.md'],
        access: { builders: 'read', gatekeeper: 'read', quinn: 'read' },
        note: 'READ ONLY for every agent — the permanent laws of physics.' },
      { id: 'l2', name: 'Layer 2 · Active State', sub: 'The Limbic System',
        contents: ['Handoff_Log.md', '[App]_PRD.md', 'Extraction_Staging/'],
        access: { builders: 'write', gatekeeper: 'read', quinn: 'read' },
        note: 'Builders WRITE active context, alpha pushes, and raw dumps.' },
      { id: 'l3', name: 'Layer 3 · Synthesized Memory', sub: 'The Cortex',
        contents: ['Modules/', 'Registries/', 'Techniques/'],
        access: { builders: 'blocked', gatekeeper: 'write', quinn: 'read' },
        note: 'Gemini WRITES formatted, decay-tracked atoms. Builders are BLOCKED here to stop unstructured noise corrupting RAG retrieval.' },
      { id: 'l4', name: 'Layer 4 · External Sync', sub: 'The Synapses (Vector RAG)',
        contents: ['Turbovault (ChromaDB)', 'NotebookLM (visionOS MD)'],
        access: { builders: 'read', gatekeeper: 'sync', quinn: 'read' },
        note: 'Gemini SYNCS; Builders + Quinn READ for micro/atomic lookups.' },
    ],
  },
  {
    id: 'ops', label: 'Operations Memory', sub: 'OpenClaw — the newer Quinn / Quell layer',
    layers: [
      { id: 'ops-mem', name: 'OpenClaw Memory', sub: 'Quinn’s working memory',
        contents: ['memory/daily/', 'MEMORY.md', 'concepts/'],
        access: { quinn: 'write' },
        note: 'Quinn WRITES via memory-append; weekly memory-synthesize consolidates it. A separate store — it never rewrites VisionAppDev.' },
      { id: 'mkt-vault', name: 'Revivr Marketing Vault', sub: 'Quell’s working memory',
        contents: ['12 Approvals/', '01 Apps/', '16 Social Queue/'],
        access: { quell: 'write' },
        note: 'Quell WRITES positioning, approvals, and the social pipeline.' },
      { id: 'ops-web', name: 'Operations Website', sub: 'This dashboard — glass over the vault',
        contents: ['/rad', '/problems', '/marketing', '/architecture'],
        access: { quinn: 'write', quell: 'read' },
        note: 'Quinn owns it; it surfaces both vaults as live pages. Read-only glass, not a second store.' },
    ],
  },
];

const ACCESS = {
  read: { label: 'READ', cls: 'a-read' },
  write: { label: 'WRITE', cls: 'a-write' },
  sync: { label: 'SYNC', cls: 'a-sync' },
  blocked: { label: 'BLOCKED', cls: 'a-blocked' },
};
const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

export default function DreamTeamOverview() {
  const [tab, setTab] = useState('memory'); // 'memory' | 'pipeline'
  const [agent, setAgent] = useState(null);  // selected agent id (highlight its access)
  const [openLayer, setOpenLayer] = useState(null);

  return (
    <div className="dt">
      <div className="dt-tabs">
        <button className={`dt-tab ${tab === 'memory' ? 'on' : ''}`} onClick={() => setTab('memory')}>Memory Architecture</button>
        <button className={`dt-tab ${tab === 'pipeline' ? 'on' : ''}`} onClick={() => setTab('pipeline')}>Build Pipeline</button>
      </div>

      {tab === 'memory' ? (
        <>
          <p className="dt-intro">
            Two memory planes. The <strong>Build</strong> plane is the VisionAppDev Dream Team RAG (Builders + a Gemini Gatekeeper).
            The <strong>Operations</strong> plane is the newer OpenClaw layer where <strong>Quinn</strong> and <strong>Quell</strong> run the studio.
            Pick an agent to see exactly what it may read, write, or is blocked from — the two planes stay deliberately separate.
          </p>

          <div className="dt-agents">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                className={`dt-agent tone-${a.tone} ${agent === a.id ? 'sel' : ''} ${agent && agent !== a.id ? 'dim' : ''}`}
                onClick={() => setAgent(agent === a.id ? null : a.id)}
              >
                <span className="dt-agent-icon">{a.icon}</span>
                <span className="dt-agent-name">{a.label}</span>
                <span className="dt-agent-sub">{a.sub}</span>
              </button>
            ))}
          </div>

          {agent && <div className="dt-agent-blurb">{AGENT_BY_ID[agent].blurb}</div>}

          <div className="dt-rule">
            <strong>⚠️ Critical rule</strong> — Coding Agents (Claude/Codex) are blocked from writing Layer 3, and Quinn never writes VisionAppDev. Each store has exactly one writer plane.
          </div>

          <div className="dt-planes">
            {PLANES.map((plane) => (
              <section key={plane.id} className={`dt-plane plane-${plane.id}`}>
                <header className="dt-plane-head">
                  <h3>{plane.label}</h3><span>{plane.sub}</span>
                </header>
                {plane.layers.map((layer) => {
                  const acc = agent ? layer.access[agent] : null;
                  const touched = !agent || acc != null;
                  const open = openLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      className={`dt-layer ${touched ? '' : 'dim'} ${open ? 'open' : ''} ${acc ? ACCESS[acc].cls : ''}`}
                      onClick={() => setOpenLayer(open ? null : layer.id)}
                    >
                      <div className="dt-layer-top">
                        <div>
                          <div className="dt-layer-name">{layer.name}</div>
                          <div className="dt-layer-sub">{layer.sub}</div>
                        </div>
                        {agent ? (
                          acc ? <span className={`dt-access ${ACCESS[acc].cls}`}>{ACCESS[acc].label}</span>
                              : <span className="dt-access a-none">—</span>
                        ) : (
                          <div className="dt-access-dots">
                            {Object.entries(layer.access).map(([aid, ac]) => (
                              <span key={aid} className={`dt-dot ${ACCESS[ac].cls}`} title={`${AGENT_BY_ID[aid].label}: ${ACCESS[ac].label}`}>
                                {AGENT_BY_ID[aid].icon}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="dt-layer-badges">
                        {layer.contents.map((c) => <span key={c} className="dt-badge">{c}</span>)}
                      </div>
                      {open && (
                        <div className="dt-layer-detail">
                          <p>{layer.note}</p>
                          <div className="dt-access-table">
                            {Object.entries(layer.access).map(([aid, ac]) => (
                              <span key={aid} className={`dt-access ${ACCESS[ac].cls}`}>{AGENT_BY_ID[aid].label}: {ACCESS[ac].label}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>

          <div className="dt-bridge">
            <span className="dt-bridge-icon">🔗</span>
            <span><strong>How the planes connect:</strong> Quinn <em>reads</em> the Build plane (project state, techniques, failure modes) to run operations, but <em>writes</em> only the Operations plane. The Operations Website then surfaces both as live pages.</span>
          </div>
        </>
      ) : (
        <BuildPipeline />
      )}
    </div>
  );
}

const PIPELINE = [
  { n: 1, title: 'Kickoff & Blueprint', agent: 'Claude / Codex', icon: '🚀', desc: 'Prompt 1 interviews you, challenges against Apple UX, and writes [App]_PRD.md into the vault.' },
  { n: 2, title: 'The Build Cycle', agent: 'Coding Agent', icon: '🔨', desc: 'Features built from the PRD; UI/logic committed and pushed to GitHub iteratively.' },
  { n: 3, title: 'Session Pause / Hand-off', agent: 'Coding Agent', icon: '⏸️', desc: 'Prompt 3: atomic prepend onto Handoff_Log.md + an alpha commit.' },
  { n: 4, title: 'Check-in Verification', agent: 'Gemini', icon: '✅', desc: 'Gemini verifies the atomic-prepend checksum and the GitHub commit landed cleanly.' },
  { n: 5, title: 'Resume Architecture', agent: 'Claude / Codex', icon: '🔄', desc: 'Prompt 2 spins a fresh session, grabbing prepended context to save tokens.' },
  { n: 6, title: 'Project Completion', agent: 'Gemini', icon: '🏁', desc: 'Final check-in + Gemini verification of the absolute final repo state.' },
  { n: 7, title: 'Raw Extraction Dump', agent: 'Coding Agent', icon: '📤', desc: 'Prompt 4 dumps unformatted lessons + failures into Extraction_Staging/.' },
  { n: 8, title: 'Gatekeeper ETL Synthesis', agent: 'Gemini', icon: '🧠', desc: 'Prompt 5: Gemini synthesizes staged dumps into Turbovault-linked, decay-tracked Markdown → NotebookLM.' },
];

function BuildPipeline() {
  return (
    <>
      <p className="dt-intro">The literal flow of one VisionAppDev project over time — token-efficient, checksum-verified, continuity-preserving.</p>
      <ol className="dt-steps">
        {PIPELINE.map((s) => (
          <li key={s.n} className={`dt-step ${s.agent === 'Gemini' ? 'gk' : 'bld'}`}>
            <span className="dt-step-icon">{s.icon}</span>
            <div>
              <div className="dt-step-head"><span className="dt-step-title">{s.n}. {s.title}</span><span className="dt-step-agent">{s.agent}</span></div>
              <div className="dt-step-desc">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
