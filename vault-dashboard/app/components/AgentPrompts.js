'use client';

import { useState } from 'react';

const PROMPTS = [
  {
    id: 'kickoff',
    title: '🏗️ 1. Start a New App',
    subtitle: 'Pre-Production Kickoff',
    description: 'Use this when you have a brand new app idea. Do not let them write code until they complete this interview.',
    text: `[URGENT] Pre-Production Kickoff & PRD Generation

I have an idea for a new application (or massive feature) that I want to build.

CRITICAL RULE: Do NOT write a single line of Swift, SwiftUI, or RealityKit code yet. We are entering a strict Pre-Production phase. Your role right now is Principal Product Manager and Spatial UX Architect.

--- PHASE 1: Interview & Scope ---
1. I will give you my raw app idea below.
2. Actively interview me. Ask highly targeted, sequential questions (no more than 2 at a time) to extract the exact immersion levels, ARKit requirements, HIG interaction paradigms, and backend security constraints needed to define the product.
3. Challenge my assumptions. If my idea violates Apple's Human Interface Guidelines, tell me why it fails and propose the native visionOS solution.

--- PHASE 2: Write the Vault File Structure (3 mandatory files) ---
Once we have fully agreed on the product scope, you MUST create ALL THREE of the following files. Do not skip any of them — all three are required for future agents to be able to resume, check in, and check out this project correctly.

⚠️ ALL VAULT WRITES USE THIS ROOT PATH:
`~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/`
*(Agent: If using scripts to read/write, you MUST expand the `~` symbol to the current machine's actual home directory before executing filesystem operations.)*

4. FILE 1 — PRD Document:
   Write to: \`Projects/[App_Name]_PRD.md\`

   ⚠️ COLLISION GUARD: Check if this file already exists before writing. If it does, DO NOT overwrite it — alert me and ask whether to update in-place or create \`[App_Name]_PRD_v2.md\`. Only write if I explicitly confirm.

   Your PRD MUST use EXACTLY these structural headings:
   - ## 1. Product Definition & MVP Scope
   - ## 2. Spatial Concept & Immersion Strategy
   - ## 3. Interaction & Accessibility (HIG)
   - ## 4. Technical Architecture & Assets
   - ## 5. Performance Budgets
   - ## 6. Privacy, Security & App Store Review
   - ## 7. Social & SharePlay
   - ## 8. Development & References

5. FILE 2 — Project State Stub:
   Write to: \`Projects/[App_Name].md\`

   This is the live state file that all future check-ins (Prompt 3) will read and update. Create it now with EXACTLY these headings (leave all sections blank — do not fill them in yet):

   ## Current Project
   ## Current Spatial Assumptions
   ## Current Debugging Assumptions
   ## Near-Term Focus
   ## Outstanding To-Dos

   ⚠️ COLLISION GUARD: Check if this file already exists. If it does, alert me — do NOT overwrite it.

6. FILE 3 — Project Registry Entry:
   Update: \`Registries/Project_Registry.md\`

   This enables future agents to locate this project during Check-Out (Prompt 2).
   The registry table has EXACTLY these 5 columns — use this schema precisely:
   | App Name | Bundle ID | Current Stage | Local Absolute Path | Check-In File |

   a. READ the FULL current contents of \`Registries/Project_Registry.md\` and count the number of data rows in the table (excluding the header row).
   b. APPEND a new row INSIDE the table, immediately before the footer line that begins with "*(To add a new project..."
      Use EXACTLY this format (the Xcode project does not exist yet at this stage):
      | **[App_Name]** | \`TBD\` | Pre-Production | \`TBD — Xcode project not yet created\` | [[App_Name]] |
   c. Do NOT put vault file paths in the Local Absolute Path column — that column is for the on-disk Xcode project location only.
   d. Save, then verify the table row count grew by exactly 1. If unchanged or decreased, you replaced the file — recover immediately.

--- PHASE 3: Dev Infrastructure ---
7. Instruct me to initialize a local Git repository, verify \`.gitignore\` security templates, and create the remote before execution.
8. Run \`asc init\` to generate the ASC.md command reference for App Store Connect workflows, and run \`asc doctor\` to verify authentication.
9. Use your \`turbovault\` MCP engine to search my Vault for "Known Failure Modes" or "Architecture Patterns" that match our features. Inject \`[[Wikilinks]]\` to them at the bottom of the PRD file only — do NOT modify any other existing vault notes in this step.

--- PHASE 4: Pre-Flight Checklist ---
10. Present me with the Pre-Flight Readiness Checklist with live ✅ / ❌ results before we begin coding:

| # | Check | Status |
|---|---|---|
| 1 | Obsidian Vault accessible | ✅ |
| 2 | Turbovault MCP online | ✅ |
| 3 | Vector MCP online | ✅ |
| 4 | Known Failure Modes reviewed | ✅ |
| 5 | SDK Drift Tracker reviewed | ✅ |
| 6 | Git repo initialized + remote set | ✅ |
| 7 | \`.gitignore\` security verified | ✅ |
| 8 | ASC CLI authenticated (\`asc doctor\`) | ✅ |
| 9 | \`ASC.md\` generated in repo (\`asc init\`) | ✅ |
| 10 | Fastlane structure ready | ✅ |
| 11 | Apple Docs MCP available | ✅ |
| 12 | SwiftLens MCP available *(if applicable)* | ✅ / ⬜ |
| 13 | PRD written to vault (\`Projects/[App_Name]_PRD.md\`) | ✅ |
| 14 | PRD wikilinked to vault history | ✅ |
| 15 | State stub created (\`Projects/[App_Name].md\`) | ✅ |
| 16 | Project added to \`Registries/Project_Registry.md\` | ✅ |

--- PHASE 5: Final Verification ---
11. Confirm this table is all green before declaring kickoff complete:

| # | Checkpoint | Status |
|---|---|---|
| 1 | PRD file is NEW and in \`Projects/\` subdirectory (not vault root) | ✅ / ❌ |
| 2 | PRD contains all 8 required structural headings | ✅ / ❌ |
| 3 | Wikilinks in PRD point to existing vault notes (no broken links) | ✅ / ❌ |
| 4 | State stub \`Projects/[App_Name].md\` exists with 5 structural headings | ✅ / ❌ |
| 5 | Project_Registry.md row count grew by exactly 1 | ✅ / ❌ |
| 6 | No existing vault files were overwritten or truncated | ✅ / ❌ |

If any row shows ❌, resolve it before we move to Stage 2.

Here is my raw idea:`
  },
  {
    id: 'checkout',
    title: '📥 2. Resume an Existing App',
    subtitle: 'App Check-Out',
    description: 'Use this when spinning up a new agent chat to work on an app that already exists in the Project Registry.',
    text: `[URGENT] App Check-Out & Context Load

We are going to resume work on an existing project.

🔒 READ-ONLY SESSION — Do NOT write to any vault files during this Check-Out. Your only job right now is to read and understand context. All vault updates happen at Check-In (Prompt 3), not here.

Your Instructions:
1. Use your read tools to check `Registries/Project_Registry.md` inside my Vault located at:
   `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/`
   *(Agent: Always expand the `~` symbol to the local home directory before executing filesystem operations.)*
   Locate the absolute path and dedicated metadata file for this app.
2. Read the app's dedicated metadata file (e.g. \`Projects/[App_Name].md\`) to understand its current architecture, the state of the codebase, and the outstanding To-Dos.
3. Read JUST THE TOP 50 LINES of \`Registries/Handoff_Log.md\` to find the single most recent \`### 🔄 Handoff\` entry. Do NOT read the entire file. Use this entry to pick up exactly where the last agent left off.
4. Briefly summarize your understanding of our immediate goal, what the last agent recommended doing next, and let's begin coding.
5. Do NOT update any project files, the registry, or the handoff log at this stage. That happens at the end of the session using Prompt 3.`
  },
  {
    id: 'checkin',
    title: '📤 3. Pause/End Work on an App',
    subtitle: 'App Check-In',
    description: 'Use this when closing out an AI session, so the next AI knows where you stopped.',
    text: `[URGENT] App Check-In & Session Handoff — ATOMIC PREPEND PROTOCOL

We are done coding this app for the time being. Before you shut down, you must formally record our progress into the Obsidian Vault so the next agent can resume seamlessly.

⚠️ DESTRUCTION SAFEGUARD — READ THIS FIRST:
Handoff_Log.md is the irreplaceable relay log for ALL projects across ALL agents.
You MUST NEVER overwrite, truncate, or replace it. You are INSERTING new lines only.
If you replace the file, you erase the institutional memory of the entire Dream Team — a critical vault failure.

--- STEP 1: Update the App's Project Profile ---
1. Use your read tools on the Vault located at:
   `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/`
   *(Agent: Always expand the `~` symbol to the local home directory before executing filesystem operations.)*
   Read the current contents of \`Registries/Project_Registry.md\` to find this project's dedicated state file.
2. Read the full current contents of that project state file (e.g., \`Projects/[App_Name].md\`).
3. Update it in-place using EXACTLY these structural headings (create them if they don't exist):
   - ## Current Project
   - ## Current Spatial Assumptions
   - ## Current Debugging Assumptions
   - ## Near-Term Focus
   - ## Outstanding To-Dos
   Completely rewrite the Outstanding To-Dos based on this session's conversation memory, the PRD, and known blockers.

--- STEP 2: Update the Project Registry (MANDATORY — Most Commonly Skipped) ---
4. Read the FULL current contents of \`Registries/Project_Registry.md\` and count how many project rows the table has.
5. Find the row for this project and update ONLY the Current Stage column to reflect the new pipeline status.
6. Save the file. Then verify the row count is IDENTICAL to what it was before — if it changed, you replaced or truncated the table. Recover immediately.

--- STEP 3: Handoff Log — ATOMIC PREPEND ---
7. READ THE CURRENT FILE FIRST. Read \`Registries/Handoff_Log.md\` in full before writing anything. You must see and preserve every existing entry.
8. COMPOSE YOUR NEW ENTRY ONLY. Write only the new handoff block — do NOT reproduce the entire file.
9. INSERT AT THE STRUCTURAL ANCHOR. Place your entry between:
      *Most recent handoff at top.*
   ...and the first --- separator immediately below it.
   You are INSERTING new markdown lines — NOT replacing the file.
10. USE THIS EXACT TEMPLATE for your entry:

---
### 🔄 Handoff — [YYYY-MM-DD HH:MM] — [Your Agent Name]

**Project:** [Project name or repo]
**Agent:** [Claude / Codex / Antigravity]
**Session Duration:** [Approximate time spent]

#### ✅ Completed This Session
- [Concise list of what was accomplished]

#### 🔧 In Progress / Pending
- [What's partially done or needs to be continued]

#### 🧠 Key Decisions Made
- [Architectural choices, tradeoffs, or design decisions — and WHY]

#### ⚠️ Blockers / Warnings
- [Known issues, failing tests, API quirks encountered]

#### 📍 Recommended Next Steps
1. [What the next agent should do first]

#### 🔗 Files Modified
- \`path/to/file\` — [brief description]

#### 📎 Related Vault Notes
- [[Note_Name]] — [why it's relevant]
---

--- STEP 4: Verify and Self-Check ---
11. Use your file read tools to confirm:
    - \`Projects/[App_Name].md\` — shows the updated headings and to-dos
    - \`Registries/Handoff_Log.md\` — your new entry is at the very top AND all previous entries still exist below it
    - \`Registries/Project_Registry.md\` — the Current Stage column is updated

Before declaring the session closed, confirm this table is all green:

| # | Checkpoint | Status |
|---|---|---|
| 1 | Projects/[App].md updated with current state, focus, and to-dos | ✅ / ❌ |
| 2 | Project_Registry.md Current Stage column updated | ✅ / ❌ |
| 3 | Handoff_Log.md new entry at top AND all prior entries still exist below | ✅ / ❌ |
| 4 | Handoff entry has timestamp, decisions+WHY, files modified, next steps | ✅ / ❌ |
| 5 | Git committed and pushed if any code was modified | ✅ / ❌ |

If any row shows ❌, fix it before the session closes.
Use [[Wikilinks]] for any new concepts so they are bound to the Knowledge Graph.`
  },
  {
    id: 'extraction',
    title: '🧠 4. Extract Knowledge (Phase 3A)',
    subtitle: 'Code Agent Post-Mortem',
    description: 'Use this with Claude or Codex after a sprint. Forces them to dump raw learnings into Staging without attempting to ingest into the Graph.',
    text: `[URGENT] Project Post-Mortem & Vault Ingestion

We have successfully completed our current objective. Before we clear this session's context window, I need you to perform a structural Post-Mortem sequence to extract everything we just learned and commit it to our long-term Obsidian Vector Memory.

Please execute the following sequence:
1. Analyze the core modules we just built, focusing specifically on any Apple framework glitches, Xcode 26 quirks, or spatial computing paradigms (SwiftUI/RealityKit/ARKit) we had to creatively bypass or solve.
2. Distill these lessons into atomic, single-topic concepts.
3. For each isolated concept, generate a *raw* Markdown file capturing your observations and code snippets.
4. **STAGING DUMP:** Save these files strictly into the \`Modules/Extraction_Staging/\` directory. Do not attempt to inject them into the main Vault, create Wikilinks, or run Turbovault. You do not need to format them perfectly.
5. **DO NOT SYNC TO NOTEBOOKLM:** You do not have authorization to sync these files to NotebookLM or ChromaDB. Your role is complete once the files are safely dumped in the Staging area.

Once you have dumped the files into \`Modules/Extraction_Staging/\`, list the file names you generated and end your session. The human will run the Gatekeeper Protocol to perform synthesis and memory ingestion.

## Related Notes
- [[Modules/Workflow Efficiency]]
- [[Templates/Contribution Protocol]]
- [[Modules/_Vault_Ingestion_Template]]
- [[Modules/External Knowledge & Tooling]]
- [[Modules/Techniques/_Index]] — All extracted atomic technique notes live here`
  },
  {
    id: 'gatekeeper',
    title: '⛩️ 5. Gatekeeper Synthesis (Phase 3B)',
    subtitle: 'Gemini ETL Pipeline',
    description: 'Use this with Gemini to extract raw notes from Staging, format them, and load them into NotebookLM and ChromaDB.',
    text: `[SYSTEM WAKE] Gatekeeper ETL Protocol Initiated

A coding sprint has just concluded. Claude or Codex has dumped raw observations and compiler notes into our staging directory. You are the Gatekeeper. Your job is to extract, transform, standardize, and load this knowledge into our permanent systems without creating Vector Noise.

Please execute the following ETL sequence precisely:

## 1. Extract (Read Staging)
- Read all files located in the \`Modules/Extraction_Staging/\` directory.
- Analyze the raw logs, compiler bugs, and architectural thoughts for the sprint.
- Deduplicate any redundant information. Group similar UI concepts or backend logic together.

## 2. Transform (Standardize into Vault)
- Mint formal, isolated Markdown files into \`Modules/Techniques/\` or update existing MOCs (Maps of Content).
- **CRITICAL RULE:** Every new file MUST strictly abide by the \`Modules/_Vault_Ingestion_Template.md\`. You must inject the YAML decay markers (\`target_os\`, \`author_ai\`, \`last_verified\`, \`confidence_score\`) at the extremely top of the file so ChromaDB can parse them mathematically.
- Use your \`turbovault\` MCP engine (\`suggest_links\` or \`search_vault\`) to find related concepts and physically inject Obsidian \`[[Wikilinks]]\` into the new documents so they are permanently stitched into the Vault Knowledge Graph.

## 3. Load (NotebookLM & ChromaDB)
- **SEMANTIC SYNC:** Use your \`NotebookLM\` skill to upload the newly minted, standardized files (and any updated MOCs) directly into the **"VisionOS MD"** notebook to maintain our broader semantic synthesis context.
- **CLEANUP:** Once the files are successfully written to the Vault and synced to NotebookLM, use your terminal access to delete the raw contents of \`Modules/Extraction_Staging/\` so we do not pollute future RAG calls.

## 4. Final Handoff
Once the pipeline completes, generate a summary of the concepts you synthesized and remind the human to execute the Vector DB rebuild script.`
  },
  {
    id: 'terminal',
    title: '💾 6. Rebuild Memory Bank',
    subtitle: 'Terminal Command',
    description: 'Run this in your Mac Terminal AFTER Step 4. It forces the ChromaDB Vector database to read all the new files you just extracted.',
    text: `rm -rf ~/.gemini/antigravity/mcp/obsidian-vector-mcp/chroma_db && \\
cd ~/.gemini/antigravity/mcp/obsidian-vector-mcp && \\
source venv_py312/bin/activate && \\
python ingest.py`
  },
  {
    id: 'logfailure',
    title: '🐛 7. Log a Failure Mode',
    subtitle: 'Append-Only Registry Update',
    description: 'Use this when you discover a new bug, API quirk, or architecture failure worth recording permanently. Safe append-only protocol for Known Failure Modes and SDK Drift Tracker.',
    text: `[URGENT] Log a New Failure Mode — ATOMIC APPEND PROTOCOL

We have discovered a new bug, API quirk, or architectural failure that must be permanently recorded in the vault registry so future agents don't repeat it.

⚠️ REGISTRY WRITE SAFEGUARD — READ THIS FIRST:
Known Failure Modes.md and SDK Drift Tracker.md are shared registries read by ALL agents across ALL projects.
You MUST NEVER overwrite, replace, or reformat these files. You are APPENDING a new entry only.

--- STEP 1: Capture the Failure ---
Before writing, confirm with me:
- The failure ID (next sequential ID, e.g., [RK-05] or [ARCH-07])
- The component affected (RealityKit / SwiftUI / ARKit / Architecture)
- The symptoms, root cause (The "Why"), the fix, and verification method

Wait for my confirmation before proceeding to Step 2.

--- STEP 2: Append to Known Failure Modes — ATOMIC APPEND ---
1. READ the FULL current contents of \`Registries/Known Failure Modes.md\` and note its current line count.
2. APPEND your new entry at the bottom of the file using EXACTLY this template:

## [ID-00] Failure Name

- Date: YYYY-MM-DD
- Component: RealityKit | SwiftUI | ARKit | Architecture
- Symptoms:
- The "Why":
- The Fix:
- Verification:

3. After saving, VERIFY the line count GREW. If it shrank or stayed the same, you replaced the file — recover immediately.
4. Also append the new ID to the correct failure category at the bottom of the file (e.g., \`- \`#failure/input\`: [..., [RK-05]]\`).

--- STEP 3: Update SDK Drift Tracker (Only if API-related) ---
5. If the failure involves an API change or version-specific behavior: Read \`Trackers/SDK Version & API Drift Tracker.md\` in full.
6. APPEND a new row to the relevant table only. Verify line count grew after saving.

--- STEP 4: Self-Check ---
7. Confirm this table is all green:

| # | Checkpoint | Status |
|---|---|---|
| 1 | New failure entry appended at bottom of Known Failure Modes.md | ✅ / ❌ |
| 2 | Known Failure Modes.md line count GREW (not replaced) | ✅ / ❌ |
| 3 | Failure category index at bottom updated with new ID | ✅ / ❌ |
| 4 | SDK Drift Tracker updated if API-related (or N/A) | ✅ / ❌ |

If any row shows ❌, fix it before declaring the log complete.`
  }
];

const VAULT_PROMPTS = [
  {
    id: 'vault-save',
    title: '🗂️ V1. Save This Session',
    subtitle: 'Vault Maintenance',
    description: 'Paste this at the end of any meaningful AI chat. The AI reads V1 from the Agent Command Center and files the report — confirm the 3-line summary before it writes anything.',
    text: `[VAULT — Save This Session]

Before we close, save this conversation as a permanent report in my Obsidian vault.

1. Read the full instructions from my Agent Command Center:
   File: Modules/Agent_Command_Center.md
   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/
   *(Agent: Expand the `~` symbol to the local home directory first)*

2. Find Section B → "📝 V1. Save a Session Report"

3. Execute those instructions exactly as written against this conversation.
   - Reports folder: VisionAppDev/Reports/
   - Archive index:  Reports/MOC — Reports Archive.md

Do NOT write any files until you have read V1 from the Agent Command Center first.
Show me your 3-line summary of what you plan to capture, then wait for my confirmation.`,
  },
  {
    id: 'vault-health',
    title: '🏥 V2. Vault Health Check',
    subtitle: 'Vault Maintenance',
    description: 'Run weekly or when the dashboard drops below 95%. Triggers a full diagnostic — broken links, dead-ends, MOC gaps, and Reports archive audit.',
    text: `[VAULT — Health Check]

Run a full vault health check and maintenance pass on my Obsidian vault.

1. Read the full instructions from my Agent Command Center:
   File: Modules/Agent_Command_Center.md
   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/
   *(Agent: Expand the `~` symbol to the local home directory first)*

2. Find Section B → "🏥 V2. Vault Health Check & MOC Maintenance"

3. Execute those instructions exactly as written.

Start with Step 1 (Diagnostic Snapshot) and report all metrics before doing anything else.`,
  },
  {
    id: 'vault-orphans',
    title: '🔗 V3. Fix Orphan Notes',
    subtitle: 'Vault Maintenance',
    description: 'Use when the dashboard shows orphan count above 0. Triages orphans, proposes backlinks for your approval, then reconnects them to the knowledge graph.',
    text: `[VAULT — Fix Orphans]

My vault has orphaned notes that need to be reconnected to the knowledge graph.

1. Read the full instructions from my Agent Command Center:
   File: Modules/Agent_Command_Center.md
   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/
   *(Agent: Expand the `~` symbol to the local home directory first)*

2. Find Section B → "🔗 V3. Orphan Note Repair Pass"

3. Execute those instructions exactly as written.

Start with Step 1 — list all orphans — and show me the full list before taking any action.`,
  },
];

export default function AgentPrompts() {
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = async (id, text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error('Fallback copy failed', error);
        } finally {
          textArea.remove();
        }
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div>
      {/* ── Section A — App Build Lifecycle ─────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        margin: '0 0 1.25rem 0',
      }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'hsl(210, 100%, 65%)',
          background: 'hsla(210, 100%, 60%, 0.1)',
          border: '1px solid hsla(210, 100%, 60%, 0.2)',
          borderRadius: '20px',
          padding: '0.3rem 0.85rem',
          whiteSpace: 'nowrap',
        }}>
          Section A — App Build Lifecycle
        </div>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
      </div>

      <div className="prompts-grid">
        {PROMPTS.map((p) => (
          <div className="card prompt-card" key={p.id}>
            <div className="prompt-header">
              <div>
                <div className="card-label">{p.subtitle}</div>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{p.title}</h3>
                <p className="card-subtitle" style={{ marginTop: 0, marginBottom: '1rem' }}>{p.description}</p>
              </div>
              <button
                className="action-btn"
                onClick={() => copyToClipboard(p.id, p.text)}
                style={{
                  background: copiedId === p.id ? 'var(--accent-green)' : 'hsla(210, 100%, 60%, 0.15)',
                  borderColor: copiedId === p.id ? 'var(--accent-green)' : 'hsla(210, 100%, 60%, 0.3)',
                  color: copiedId === p.id ? '#fff' : 'var(--accent-blue)',
                  padding: '0.5rem 1rem',
                  width: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedId === p.id ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="log-output" style={{ marginTop: 'auto', maxHeight: '180px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {p.text}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section B — Vault Maintenance ────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        margin: '2.5rem 0 1.25rem 0',
      }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'hsl(280, 70%, 70%)',
          background: 'hsla(280, 60%, 50%, 0.12)',
          border: '1px solid hsla(280, 60%, 50%, 0.25)',
          borderRadius: '20px',
          padding: '0.3rem 0.85rem',
          whiteSpace: 'nowrap',
        }}>
          Section B — Vault Maintenance & Reporting
        </div>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginBottom: '1rem',
        paddingLeft: '0.25rem',
      }}>
        These are not about app building. Paste them at the end of any session or when the vault needs maintenance.
      </div>

      <div className="prompts-grid">
        {VAULT_PROMPTS.map((p) => (
          <div
            className="card prompt-card"
            key={p.id}
            style={{
              borderColor: 'hsla(280, 60%, 50%, 0.18)',
              background: 'hsla(280, 40%, 10%, 0.3)',
            }}
          >
            <div className="prompt-header">
              <div>
                <div className="card-label" style={{ color: 'hsl(280, 60%, 65%)' }}>{p.subtitle}</div>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{p.title}</h3>
                <p className="card-subtitle" style={{ marginTop: 0, marginBottom: '1rem' }}>{p.description}</p>
              </div>
              <button
                className="action-btn"
                onClick={() => copyToClipboard(p.id, p.text)}
                style={{
                  background: copiedId === p.id ? 'var(--accent-green)' : 'hsla(280, 60%, 50%, 0.15)',
                  borderColor: copiedId === p.id ? 'var(--accent-green)' : 'hsla(280, 60%, 50%, 0.3)',
                  color: copiedId === p.id ? '#fff' : 'hsl(280, 60%, 70%)',
                  padding: '0.5rem 1rem',
                  width: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedId === p.id ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="log-output" style={{ marginTop: 'auto', maxHeight: '180px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {p.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

