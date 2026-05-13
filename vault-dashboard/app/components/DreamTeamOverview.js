import React, { useState } from 'react';

const flowNodes = [
  {
    id: "kickoff",
    title: "1. Kickoff & Blueprint",
    agent: "Claude / Codex",
    description: "Run Prompt 1. Q&A establishes the PRD, you set up the Xcode project root, and the agent connects to the context.",
    type: "start",
    icon: "🚀"
  },
  {
    id: "development",
    title: "2. The Build Cycle",
    agent: "Coding Agent",
    description: "Agent develops features from the PRD. UI/logic is committed and pushed to the GitHub repo iteratively.",
    type: "build",
    icon: "🔨"
  },
  {
    id: "pause",
    title: "3. Session Pause / Hand-off",
    agent: "Coding Agent",
    description: "Run Prompt 3. Agent checks in the project, performs the Atomic Prepend on Handoff_Log.md, and pushes an Alpha Commit.",
    type: "system",
    icon: "⏸️"
  },
  {
    id: "gemini_verify_1",
    title: "4. Check-In Verification",
    agent: "Gemini",
    description: "Gemini acts as the observer, verifying that the Atomic Prepend checksum and GitHub commit were executed flawlessly.",
    type: "gatekeeper",
    icon: "✅"
  },
  {
    id: "resume",
    title: "5. Resume Architecture",
    agent: "Claude / Codex",
    description: "Run Prompt 2. A new AI session spins up, grabbing the prepended context to save tokens and resume the Build Cycle.",
    type: "loop",
    icon: "🔄"
  },
  {
    id: "final_end",
    title: "6. Project Completion",
    agent: "Gemini",
    description: "Run Prompt 3 for the final check-in, followed by Gemini verification of the absolute final repository state.",
    type: "gatekeeper",
    icon: "🏁"
  },
  {
    id: "extraction",
    title: "7. Raw Extraction Dump",
    agent: "Coding Agent",
    description: "Run Prompt 4. The builder dumps massive, unformatted technical lessons and known failures directly into Extraction_Staging.",
    type: "system",
    icon: "📤"
  },
  {
    id: "gatekeeper_etl",
    title: "8. Gatekeeper ETL Synthesis",
    agent: "Gemini",
    description: "Run Prompt 5. Gemini transforms the staged dump into TurboVault-linked, decay-tracked Markdown and pushes to NotebookLM.",
    type: "gatekeeper",
    icon: "🧠"
  }
];

const vaultLayers = [
  {
    id: "layer1",
    name: "Layer 1: Core Directives",
    subtitle: "The Brainstem",
    contents: ["visionOS_Playbook.md", "Agent_Succession_Protocol.md", "Dream_Team_Agentic_SOP.md"],
    access: "READ ONLY for all agents. Defines the permanent laws of physics."
  },
  {
    id: "layer2",
    name: "Layer 2: The Active State",
    subtitle: "The Limbic System",
    contents: ["Handoff_Log.md", "[App]_PRD.md", "Extraction_Staging/"],
    access: "CLAUDE/CODEX WRITE. Active context, alpha code pushing, raw dumps."
  },
  {
    id: "layer3",
    name: "Layer 3: Synthesized Memory",
    subtitle: "The Cortex",
    contents: ["Modules/", "Registries/", "Techniques/"],
    access: "GEMINI WRITE. Formatted & decayed atomic data. Builders are BLOCKED from writing here."
  },
  {
    id: "layer4",
    name: "Layer 4: External Sync",
    subtitle: "The Synapses (Vector RAG)",
    contents: ["Turbovault (ChromaDB)", "NotebookLM (VisionOS MD)"],
    access: "GEMINI SYNC. Claude/Codex READ for micro/atomic lookups."
  }
];

export default function DreamTeamOverview() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'topology'

  return (
    <div className={`overview-container ${viewMode === 'topology' ? 'topology-active' : ''}`}>
      <div className="overview-sidebar">
        <h2>{viewMode === 'pipeline' ? 'System Architecture' : 'Vault Topology'} Overview</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setViewMode('pipeline')}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-subtle)',
              background: viewMode === 'pipeline' ? 'hsla(210, 100%, 60%, 0.2)' : 'transparent',
              color: viewMode === 'pipeline' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            Temporal Pipeline
          </button>
          <button 
            onClick={() => setViewMode('topology')}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-subtle)',
              background: viewMode === 'topology' ? 'hsla(270, 80%, 65%, 0.2)' : 'transparent',
              color: viewMode === 'topology' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            Vault Topology
          </button>
        </div>

        {viewMode === 'pipeline' ? (
          <>
            <p>This is the literal flow of a Dream Team VisionOS project over time. It strictly enforces token-efficiency, database integrity, and verifiable continuity.</p>
            <div className="overview-legend">
              <h3>Personas</h3>
              <div className="legend-item"><span className="dot build"></span><strong>Builders (Claude/Codex):</strong> Write code, push to GitHub, dump raw extraction notes. Restricted from vector injection.</div>
              <div className="legend-item"><span className="dot gatekeeper"></span><strong>Gatekeeper (Gemini):</strong> Operates the ETL pipeline, verifies check-ins, checks checksums, and manages NotebookLM architecture.</div>
            </div>
            <div className="overview-legend" style={{ marginTop: '2rem' }}>
              <h3>Core Artifacts</h3>
              <ul style={{ paddingLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>PRD:</strong> The central truth.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Handoff_Log.md:</strong> Passed between agents geometrically growing via Atomic Prepend.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Extraction_Staging:</strong> Unformatted MD quarantine zone.</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <p>This maps the physical geological layers of the Obsidian Vault and strictly enforces where agents are permitted to read or write data.</p>
            <div className="overview-legend" style={{ marginTop: '2rem' }}>
              <h3>Agent Sandboxing</h3>
              <div style={{ background: 'hsla(0, 80%, 60%, 0.1)', border: '1px dashed var(--accent-red)', padding: '1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>⚠️ CRITICAL RULE:</span> Coding Agents (Claude/Codex) are mathematically blocked from writing into <strong>Layer 3</strong> to prevent unstructured noise from corrupting RAG retrieval.
              </div>
            </div>
          </>
        )}
      </div>

      <div className="overview-flowchart">
        {viewMode === 'pipeline' ? (
          <div className="flowchart-path">
            {flowNodes.map((node, index) => {
              const isHovered = hoveredNode === node.id;
              const isLoop = node.type === 'loop';

              return (
                <div 
                  key={node.id} 
                  className={`flow-node-wrapper ${isHovered ? 'active' : ''} ${isLoop ? 'loop-node' : ''}`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {index < flowNodes.length - 1 && <div className="flow-connector" />}

                  <div className={`flow-node type-${node.type}`}>
                    <div className="node-icon">{node.icon}</div>
                    <div className="node-content">
                      <div className="node-header">
                        <span className="node-title">{node.title}</span>
                        <span className="node-agent">{node.agent}</span>
                      </div>
                      <div className="node-desc">{node.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="topology-container">
            <div className="agent-panel builder-panel">
              <h4>🛠️ Builders<br/><span>(Claude / Codex)</span></h4>
            </div>

            <div className="topology-svg-col">
              <svg width="100%" height="100%" viewBox="0 0 100 800" preserveAspectRatio="none">
                {/* Builder reads Layer 1 (y=154) */}
                <path d="M 0,400 C 50,400 50,154 100,154" className="line-read pulse-reverse" />
                {/* Builder writes Layer 2 (y=318) */}
                <path d="M 0,400 C 50,400 50,318 100,318" className="line-write-builder pulse" />
                {/* Builder BLOCKED from Layer 3 (y=482) */}
                <path d="M 0,400 C 50,400 50,482 100,482" className="line-blocked" />
                {/* Builder reads Layer 4 (y=646) */}
                <path d="M 0,400 C 50,400 50,646 100,646" className="line-read pulse-reverse" />
              </svg>
            </div>
            
            <div className="vault-stack">
              {vaultLayers.map((layer) => (
                <div key={layer.id} className={`vault-layer ${layer.id}`}>
                  <div className="layer-header">
                    <span className="layer-name">{layer.name}</span>
                    <span className="layer-subtitle">{layer.subtitle}</span>
                  </div>
                  <div className="layer-contents">
                    {layer.contents.map(c => <span key={c} className="layer-badge">{c}</span>)}
                  </div>
                  <div className="layer-access">{layer.access}</div>
                </div>
              ))}
            </div>

            <div className="topology-svg-col">
              <svg width="100%" height="100%" viewBox="0 0 100 800" preserveAspectRatio="none">
                {/* Gatekeeper reads Layer 2 (y=318) */}
                <path d="M 100,400 C 50,400 50,318 0,318" className="line-read pulse-reverse" />
                {/* Gatekeeper writes Layer 3 (y=482) */}
                <path d="M 100,400 C 50,400 50,482 0,482" className="line-write-gatekeeper pulse" />
                {/* Gatekeeper syncs Layer 4 (y=646) */}
                <path d="M 100,400 C 50,400 50,646 0,646" className="line-write-gatekeeper pulse" />
              </svg>
            </div>

            <div className="agent-panel gatekeeper-panel">
              <h4>🧠 Gatekeeper<br/><span>(Gemini)</span></h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
