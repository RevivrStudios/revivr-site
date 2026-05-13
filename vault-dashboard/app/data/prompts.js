// Prompt data stored as plain strings to avoid template literal parsing issues.
// Each prompt uses String.raw or regular strings with escaped backticks.

export const BUILD_PROMPTS = [
  {
    id: 'kickoff',
    title: '1. Start a New App',
    subtitle: 'Pre-Production Kickoff',
    description: 'Use this when you have a brand new app idea. Do not let them write code until they complete this interview.',
    text: "[URGENT] Pre-Production Kickoff & PRD Generation\n\nI have an idea for a new application (or massive feature) that I want to build.\n\nCRITICAL RULE: Do NOT write a single line of Swift, SwiftUI, or RealityKit code yet. We are entering a strict Pre-Production phase. Your role right now is Principal Product Manager and Spatial UX Architect.\n\n--- PHASE 1: Interview & Scope ---\n1. I will give you my raw app idea below.\n2. Actively interview me. Ask highly targeted, sequential questions (no more than 2 at a time) to extract the exact immersion levels, ARKit requirements, HIG interaction paradigms, and backend security constraints needed to define the product.\n3. Challenge my assumptions. If my idea violates Apple's Human Interface Guidelines, tell me why it fails and propose the native visionOS solution.\n\n--- PHASE 2: Write the Vault File Structure (3 mandatory files) ---\nOnce we have fully agreed on the product scope, you MUST create ALL THREE of the following files. Do not skip any of them \u2014 all three are required for future agents to be able to resume, check in, and check out this project correctly.\n\nALL VAULT WRITES USE THIS ROOT PATH:\n~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/\n(Agent: If using scripts to read/write, you MUST expand the ~ symbol to the current machine\u2019s actual home directory before executing filesystem operations.)\n\n4. FILE 1 \u2014 PRD Document:\n   Write to: Projects/[App_Name]_PRD.md\n   COLLISION GUARD: Check if this file already exists before writing. If it does, DO NOT overwrite it \u2014 alert me and ask whether to update in-place or create [App_Name]_PRD_v2.md. Only write if I explicitly confirm.\n   Your PRD MUST use EXACTLY these structural headings:\n   - ## 1. Product Definition & MVP Scope\n   - ## 2. Spatial Concept & Immersion Strategy\n   - ## 3. Interaction & Accessibility (HIG)\n   - ## 4. Technical Architecture & Assets\n   - ## 5. Performance Budgets\n   - ## 6. Privacy, Security & App Store Review\n   - ## 7. Social & SharePlay\n   - ## 8. Development & References\n\n5. FILE 2 \u2014 Project State Stub:\n   Write to: Projects/[App_Name].md\n   This is the live state file that all future check-ins (Prompt 3) will read and update. Create it now with EXACTLY these headings (leave all sections blank):\n   ## Current Project\n   ## Current Spatial Assumptions\n   ## Current Debugging Assumptions\n   ## Near-Term Focus\n   ## Outstanding To-Dos\n   COLLISION GUARD: Check if this file already exists. If it does, alert me \u2014 do NOT overwrite it.\n\n6. FILE 3 \u2014 Project Registry Entry:\n   Update: Registries/Project_Registry.md\n   This enables future agents to locate this project during Check-Out (Prompt 2).\n   The registry table has EXACTLY these 5 columns:\n   | App Name | Bundle ID | Current Stage | Local Absolute Path | Check-In File |\n   a. READ the FULL current contents and count the number of data rows.\n   b. APPEND a new row INSIDE the table.\n   c. Do NOT put vault file paths in the Local Absolute Path column.\n   d. Save, then verify the table row count grew by exactly 1.\n\n--- PHASE 3: Dev Infrastructure ---\n7. Instruct me to initialize a local Git repository, verify .gitignore security templates, and create the remote before execution.\n8. Run asc init to generate the ASC.md command reference, and run asc doctor to verify authentication.\n9. Use your turbovault MCP engine to search my Vault for \"Known Failure Modes\" or \"Architecture Patterns\" that match our features. Inject [[Wikilinks]] to them at the bottom of the PRD file only.\n\n--- PHASE 4: Pre-Flight Checklist ---\n10. Present me with the Pre-Flight Readiness Checklist with live results before we begin coding.\n\n--- PHASE 5: Final Verification ---\n11. Confirm this table is all green before declaring kickoff complete.\n\nHere is my raw idea:"
  },
  {
    id: 'checkout',
    title: '2. Resume an Existing App',
    subtitle: 'App Check-Out',
    description: 'Use this when spinning up a new agent chat to work on an app that already exists in the Project Registry.',
    text: "[URGENT] App Check-Out & Context Load\n\nWe are going to resume work on an existing project.\n\nREAD-ONLY SESSION \u2014 Do NOT write to any vault files during this Check-Out. Your only job right now is to read and understand context. All vault updates happen at Check-In (Prompt 3), not here.\n\nYour Instructions:\n1. Use your read tools to check Registries/Project_Registry.md inside my Vault located at:\n   ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/\n   (Agent: Always expand the ~ symbol to the local home directory before executing filesystem operations.)\n   Locate the absolute path and dedicated metadata file for this app.\n2. Read the app's dedicated metadata file (e.g. Projects/[App_Name].md) to understand its current architecture, the state of the codebase, and the outstanding To-Dos.\n3. Read JUST THE TOP 50 LINES of Registries/Handoff_Log.md to find the single most recent Handoff entry. Do NOT read the entire file.\n4. Briefly summarize your understanding of our immediate goal, what the last agent recommended doing next, and let's begin coding.\n5. Do NOT update any project files, the registry, or the handoff log at this stage."
  },
  {
    id: 'checkin',
    title: '3. Pause/End Work on an App',
    subtitle: 'App Check-In',
    description: 'Use this when closing out an AI session, so the next AI knows where you stopped.',
    text: "[URGENT] App Check-In & Session Handoff \u2014 ATOMIC PREPEND PROTOCOL\n\nWe are done coding this app for the time being. Before you shut down, you must formally record our progress into the Obsidian Vault so the next agent can resume seamlessly.\n\nDESTRUCTION SAFEGUARD \u2014 READ THIS FIRST:\nHandoff_Log.md is the irreplaceable relay log for ALL projects across ALL agents.\nYou MUST NEVER overwrite, truncate, or replace it. You are INSERTING new lines only.\n\n--- STEP 1: Update the App's Project Profile ---\n1. Read Registries/Project_Registry.md to find this project's dedicated state file.\n2. Read the full current contents of that project state file.\n3. Update it in-place using EXACTLY these structural headings:\n   - ## Current Project\n   - ## Current Spatial Assumptions\n   - ## Current Debugging Assumptions\n   - ## Near-Term Focus\n   - ## Outstanding To-Dos\n\n--- STEP 2: Update the Project Registry ---\n4. Read the FULL current contents and count how many project rows the table has.\n5. Find the row for this project and update ONLY the Current Stage column.\n6. Save and verify the row count is IDENTICAL.\n\n--- STEP 3: Handoff Log \u2014 ATOMIC PREPEND ---\n7. READ THE CURRENT FILE FIRST.\n8. COMPOSE YOUR NEW ENTRY ONLY.\n9. INSERT AT THE STRUCTURAL ANCHOR.\n10. USE THE EXACT TEMPLATE (see Agent Command Center for format).\n\n--- STEP 4: Verify and Self-Check ---\n11. Confirm all checkpoints are green before declaring session closed.\nUse [[Wikilinks]] for any new concepts so they are bound to the Knowledge Graph."
  },
  {
    id: 'extraction',
    title: '4. Extract Knowledge (Phase 3A)',
    subtitle: 'Code Agent Post-Mortem',
    description: 'Use this with Claude or Codex after a sprint. Forces them to dump raw learnings into Staging.',
    text: "[URGENT] Project Post-Mortem & Vault Ingestion\n\nWe have successfully completed our current objective. Before we clear this session's context window, I need you to perform a structural Post-Mortem sequence to extract everything we just learned and commit it to our long-term Obsidian Vector Memory.\n\nPlease execute the following sequence:\n1. Analyze the core modules we just built, focusing on Apple framework glitches, Xcode 26 quirks, or spatial computing paradigms we had to creatively solve.\n2. Distill these lessons into atomic, single-topic concepts.\n3. For each isolated concept, generate a raw Markdown file.\n4. STAGING DUMP: Save these files strictly into the Modules/Extraction_Staging/ directory. Do not attempt to inject them into the main Vault.\n5. DO NOT SYNC TO NOTEBOOKLM: You do not have authorization to sync these files.\n\nOnce you have dumped the files into Modules/Extraction_Staging/, list the file names you generated and end your session."
  },
  {
    id: 'gatekeeper',
    title: '5. Gatekeeper Synthesis (Phase 3B)',
    subtitle: 'Gemini ETL Pipeline',
    description: 'Use this with Gemini to extract raw notes from Staging, format them, and load them into NotebookLM and ChromaDB.',
    text: "[SYSTEM WAKE] Gatekeeper ETL Protocol Initiated\n\nA coding sprint has just concluded. Claude or Codex has dumped raw observations into our staging directory. You are the Gatekeeper. Your job is to extract, transform, standardize, and load this knowledge into our permanent systems.\n\n## 1. Extract (Read Staging)\n- Read all files in Modules/Extraction_Staging/\n- Deduplicate redundant information.\n\n## 2. Transform (Standardize into Vault)\n- Mint formal Markdown files into Modules/Techniques/ or update existing MOCs.\n- CRITICAL RULE: Every new file MUST abide by the Modules/_Vault_Ingestion_Template.md.\n- Use turbovault MCP engine to find related concepts and inject [[Wikilinks]].\n\n## 3. Load (NotebookLM & ChromaDB)\n- SEMANTIC SYNC: Use NotebookLM skill to upload files to the \"VisionOS MD\" notebook.\n- CLEANUP: Delete the raw contents of Modules/Extraction_Staging/.\n\n## 4. Final Handoff\nGenerate a summary and remind the human to execute the Vector DB rebuild script."
  },
  {
    id: 'terminal',
    title: '6. Rebuild Memory Bank',
    subtitle: 'Terminal Command',
    description: 'Run this in your Mac Terminal AFTER Step 4. Forces the ChromaDB Vector database to read all new files.',
    text: "rm -rf ~/.gemini/antigravity/mcp/obsidian-vector-mcp/chroma_db && \\\ncd ~/.gemini/antigravity/mcp/obsidian-vector-mcp && \\\nsource venv_py312/bin/activate && \\\npython ingest.py"
  },
  {
    id: 'logfailure',
    title: '7. Log a Failure Mode',
    subtitle: 'Append-Only Registry Update',
    description: 'Use this when you discover a new bug, API quirk, or architecture failure worth recording permanently.',
    text: "[URGENT] Log a New Failure Mode \u2014 ATOMIC APPEND PROTOCOL\n\nWe have discovered a new bug, API quirk, or architectural failure that must be permanently recorded in the vault registry.\n\nREGISTRY WRITE SAFEGUARD:\nKnown Failure Modes.md and SDK Drift Tracker.md are shared registries read by ALL agents.\nYou MUST NEVER overwrite, replace, or reformat these files. You are APPENDING a new entry only.\n\n--- STEP 1: Capture the Failure ---\nConfirm with me: the failure ID, the component affected, the symptoms, root cause, the fix, and verification method.\n\n--- STEP 2: Append to Known Failure Modes ---\n1. READ the FULL current contents and note the line count.\n2. APPEND your new entry at the bottom.\n3. After saving, VERIFY the line count GREW.\n\n--- STEP 3: Update SDK Drift Tracker (Only if API-related) ---\n5. If API-related: Read and APPEND a new row only.\n\n--- STEP 4: Self-Check ---\n7. Confirm all checkpoints are green."
  }
];

export const VAULT_PROMPTS = [
  {
    id: 'vault-save',
    title: 'V1. Save This Session',
    subtitle: 'Vault Maintenance',
    description: 'Paste this at the end of any meaningful AI chat. The AI reads V1 from the Agent Command Center and files the report.',
    text: "[VAULT \u2014 Save This Session]\n\nBefore we close, save this conversation as a permanent report in my Obsidian vault.\n\n1. Read the full instructions from my Agent Command Center:\n   File: Modules/Agent_Command_Center.md\n   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/\n   (Agent: Expand the ~ symbol to the local home directory first)\n\n2. Find Section B \u2192 \"V1. Save a Session Report\"\n\n3. Execute those instructions exactly as written against this conversation.\n   - Reports folder: VisionAppDev/Reports/\n   - Archive index: Reports/MOC \u2014 Reports Archive.md\n\nDo NOT write any files until you have read V1 from the Agent Command Center first.\nShow me your 3-line summary of what you plan to capture, then wait for my confirmation."
  },
  {
    id: 'vault-health',
    title: 'V2. Vault Health Check',
    subtitle: 'Vault Maintenance',
    description: 'Run weekly or when the dashboard drops below 95%. Triggers a full diagnostic.',
    text: "[VAULT \u2014 Health Check]\n\nRun a full vault health check and maintenance pass on my Obsidian vault.\n\n1. Read the full instructions from my Agent Command Center:\n   File: Modules/Agent_Command_Center.md\n   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/\n   (Agent: Expand the ~ symbol to the local home directory first)\n\n2. Find Section B \u2192 \"V2. Vault Health Check & MOC Maintenance\"\n\n3. Execute those instructions exactly as written.\n\nStart with Step 1 (Diagnostic Snapshot) and report all metrics before doing anything else."
  },
  {
    id: 'vault-orphans',
    title: 'V3. Fix Orphan Notes',
    subtitle: 'Vault Maintenance',
    description: 'Use when the dashboard shows orphan count above 0. Triages orphans and reconnects them to the knowledge graph.',
    text: "[VAULT \u2014 Fix Orphans]\n\nMy vault has orphaned notes that need to be reconnected to the knowledge graph.\n\n1. Read the full instructions from my Agent Command Center:\n   File: Modules/Agent_Command_Center.md\n   Vault: ~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/\n   (Agent: Expand the ~ symbol to the local home directory first)\n\n2. Find Section B \u2192 \"V3. Orphan Note Repair Pass\"\n\n3. Execute those instructions exactly as written.\n\nStart with Step 1 \u2014 list all orphans \u2014 and show me the full list before taking any action."
  }
];
