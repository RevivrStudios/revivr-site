// ===========================================================================
// Revivr Studios — Business Map data model
// ===========================================================================
// Single source of truth for the /architecture Three.js business map. Nothing
// about the business is hardcoded into scene-building code — the renderer reads
// only NODES and EDGES from here. Positions/colors are DERIVED from tier/owner
// by the renderer (see three/nodes.js), not stored here.
//
// ---------------------------------------------------------------------------
// HOW TO EXTEND THE MAP
// ---------------------------------------------------------------------------
// Add a new PROJECT:
//   - Append a NODE with tier:'project', owner:'shared', visibleInitially:false,
//     and set opsOwner:'quinn', marketingOwner:'quell', plus status/platform/
//     nextMilestone/vaultPath/opsSection.
//   - Add TWO EDGES: { from:'quinn', to:<id>, type:'owns-execution' } and
//     { from:'quell', to:<id>, type:'owns-positioning' }. The renderer detects
//     that both quinn and quell touch the node (co-occurrence) and draws a
//     single blended amber/magenta line — do NOT add a separate 'shared' edge.
//
// Add a new RESPONSIBILITY under Quinn or Quell:
//   - Append a NODE with tier:'domain', owner:'quinn' (or 'quell'),
//     visibleInitially:false.
//   - Add ONE EDGE from the agent: { from:'quinn', to:<id>, type:'owns' }.
//     (Optionally also from the hub, e.g. 'operations'/'marketing', so the
//     child reveals when either the agent or its hub is clicked.)
//
// Add a new EXTERNAL TOOL:
//   - Append a NODE with tier:'external', visibleInitially:false.
//   - Add EDGES ONLY for meaningful integrations, per the GitHub/ASC examples
//     below (e.g. { from:<id>, to:'quinn', type:'integrates' }). Do NOT wire
//     every tool to every agent — the map earns its clarity from restraint.
//     A hidden node is revealed by clicking any node it shares an edge with.
//
// Reveal model: the 9 nodes with visibleInitially:true render at start. Clicking
// a node reveals its hidden edge-neighbours (its children/integrations). Filters
// only dim/highlight; they never add or remove nodes.
// ===========================================================================

export const NODES = [
  // ---- CORE / initial view (visibleInitially: true) ----------------------
  {
    id: 'revivr-studios',
    label: 'Revivr Studios',
    tier: 'core',
    owner: null,
    group: 'core',
    description:
      'Solo accessibility-first spatial-computing studio (founder: Einar Johnson). Two AI operators — Quinn (ops) and Quell (marketing) — run the day-to-day around a shared Obsidian knowledge base and the Operations Website.',
    responsibilities: [
      'Set direction and the accessibility mission',
      'Own the app portfolio and roadmap',
      'Delegate execution to Quinn and positioning to Quell',
    ],
    status: null,
    platform: null,
    opsOwner: null,
    marketingOwner: null,
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/',
    opsSection: '/',
    visibleInitially: true,
  },
  {
    id: 'quinn',
    label: 'Quinn — Operations',
    tier: 'agent',
    owner: 'quinn',
    group: 'quinn',
    description:
      'The resident operations agent. Turns the roadmap into tracked execution: project state, tasks, milestones, dev status, risks, releases, and documentation — all recorded live in the vault and surfaced on the Operations Website.',
    responsibilities: [
      'Run project execution end to end',
      'Keep the vault and Operations Website in sync',
      'Flag risks, blockers, and release readiness',
    ],
    status: null,
    platform: null,
    opsOwner: 'quinn',
    marketingOwner: null,
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/Project_State/',
    opsSection: '/quinn',
    visibleInitially: true,
  },
  {
    id: 'quell',
    label: 'Quell — Marketing',
    tier: 'agent',
    owner: 'quell',
    group: 'quell',
    description:
      'The resident marketing agent. Owns how the work is positioned and told: product positioning, App Store presence, website messaging, social, campaigns, audience research, and launch planning — worked live in the Revivr Marketing sub-vault.',
    responsibilities: [
      'Own positioning and messaging for every app',
      'Run the App Store, social, and campaign pipeline',
      'Prepare launches and read marketing performance',
    ],
    status: null,
    platform: null,
    opsOwner: null,
    marketingOwner: 'quell',
    nextMilestone: null,
    vaultPath: 'Revivr Marketing/',
    opsSection: '/quell',
    visibleInitially: true,
  },
  {
    id: 'operations',
    label: 'Operations',
    tier: 'domain',
    owner: 'quinn',
    group: 'operations',
    description:
      'The execution surface Quinn owns — the operational domains that move a project from idea to shipped: tracking, tasks, milestones, dev status, risk, release, and docs.',
    responsibilities: ['Execution planning', 'Status of record', 'Release coordination'],
    status: null,
    platform: null,
    opsOwner: 'quinn',
    marketingOwner: null,
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/Project_State/',
    opsSection: '/quinn',
    visibleInitially: true,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    tier: 'domain',
    owner: 'quell',
    group: 'marketing',
    description:
      'The positioning surface Quell owns — the marketing domains that turn a shipped app into a told story: positioning, App Store, messaging, social, campaigns, research, assets, launch, and performance.',
    responsibilities: ['Positioning & messaging', 'Channels & campaigns', 'Launch & performance'],
    status: null,
    platform: null,
    opsOwner: null,
    marketingOwner: 'quell',
    nextMilestone: null,
    vaultPath: 'Revivr Marketing/',
    opsSection: '/marketing/approvals',
    visibleInitially: true,
  },
  {
    id: 'projects',
    label: 'Projects',
    tier: 'project',
    owner: 'shared',
    group: 'projects',
    description:
      'The app portfolio. Each project is executed by Quinn and positioned by Quell — a shared responsibility the map draws as a blended amber/magenta line. Click to reveal the individual apps.',
    responsibilities: ['Ship accessible spatial apps', 'Prove interaction patterns', 'Feed the mission'],
    status: null,
    platform: null,
    opsOwner: 'quinn',
    marketingOwner: 'quell',
    nextMilestone: null,
    vaultPath: 'VisionAppDev/RAD/',
    opsSection: '/rad',
    visibleInitially: true,
  },
  {
    id: 'accessibility',
    label: 'Accessibility Mission',
    tier: 'accessibility',
    owner: null,
    group: 'accessibility',
    description:
      'The reason the studio exists: independent, hands-free, eye-driven access to computing for people with mobility limitations. Every project and interaction choice is measured against it. Click to reveal the mission’s facets.',
    responsibilities: [
      'Design for mobility-limited independence',
      'Advance eye/hands-free interaction',
      'Prove accessibility on Vision Pro and WebXR',
    ],
    status: null,
    platform: null,
    opsOwner: null,
    marketingOwner: null,
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/',
    opsSection: null,
    visibleInitially: true,
  },
  {
    id: 'obsidian-vault',
    label: 'Obsidian Vault',
    tier: 'core',
    owner: 'shared',
    group: 'obsidian',
    description:
      'The shared knowledge base and system of record. Quinn reads/writes the operations vault; Quell reads/writes the Revivr Marketing sub-vault. Its state is summarized live into the Operations Website.',
    responsibilities: [
      'Hold project state, decisions, and memory',
      'Separate ops (OpenClaw_Agent) and marketing (Revivr Marketing) vaults',
      'Feed the Operations Website',
    ],
    status: null,
    platform: null,
    opsOwner: 'quinn',
    marketingOwner: 'quell',
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/  ·  Revivr Marketing/',
    opsSection: '/vault',
    visibleInitially: true,
  },
  {
    id: 'operations-website',
    label: 'Operations Website',
    tier: 'core',
    owner: 'quinn',
    group: 'operations',
    description:
      'This dashboard — the glass over the vault. Renders vault state (projects, problems, awareness, marketing, renewals) as live pages, and is where the assistant, RAD, and this business map live. Built on Next.js; the map uses Three.js.',
    responsibilities: ['Surface vault state as live pages', 'Host the assistant + RAD + this map', 'Read-only glass, not a second store'],
    status: null,
    platform: 'Next.js · Mac Studio runtime',
    opsOwner: 'quinn',
    marketingOwner: null,
    nextMilestone: null,
    vaultPath: 'OpenClaw_Agent/Infrastructure/VaultDashboard/',
    opsSection: '/architecture',
    visibleInitially: true,
  },

  // ---- Quinn's operational responsibilities (tier: domain, owner: quinn) --
  // Revealed when Quinn or Operations is clicked.
  ...[
    ['project-tracking', 'Project Tracking', 'Live state of every app: lifecycle stage, classification, and next action, read from the RAD registry.', '/rad', 'VisionAppDev/RAD/'],
    ['tasks-priorities', 'Tasks & Priorities', 'What to do next and in what order across the portfolio.', '/rad', 'OpenClaw_Agent/Project_State/'],
    ['milestones', 'Milestones', 'Dated targets per app and their status against the calendar.', '/rad', 'VisionAppDev/RAD/'],
    ['dev-status', 'Dev Status', 'Build/health status per project — on track, blocked, or at risk.', '/rad', 'VisionAppDev/RAD/'],
    ['risks-blockers', 'Risks & Blockers', 'Open blockers surfaced from the Problems board onto the operating board.', '/problems', 'OpenClaw_Agent/Infrastructure/VaultDashboard/data/problems/'],
    ['release-planning', 'Release Planning', 'TestFlight/App Store readiness and the path to ship.', '/rad', 'VisionAppDev/RAD/'],
    ['documentation', 'Documentation', 'Handoffs, decisions, failure modes, and SDK drift kept in the vault.', '/vault', 'VisionAppDev/Registries/'],
  ].map(([id, label, description, opsSection, vaultPath]) => ({
    id, label, tier: 'domain', owner: 'quinn', group: 'operations',
    description, responsibilities: [], status: null, platform: null,
    opsOwner: 'quinn', marketingOwner: null, nextMilestone: null,
    vaultPath, opsSection, visibleInitially: false,
  })),

  // ---- Quell's marketing responsibilities (tier: domain, owner: quell) ----
  // Revealed when Quell or Marketing is clicked.
  ...[
    ['product-positioning', 'Product Positioning', 'What each app is, who it is for, and why it matters — the core story.', '/marketing/apps', 'Revivr Marketing/01 Apps/'],
    ['app-store-marketing', 'App Store Marketing', 'Store listings, screenshots, keywords, and product pages.', '/marketing/apps', 'Revivr Marketing/01 Apps/'],
    ['website-messaging', 'Website Messaging', 'Public-facing copy and narrative for the studio and apps.', '/marketing/report', 'Revivr Marketing/'],
    ['social-media', 'Social Media', 'The social pipeline: drops, queue, reposts, and voice.', '/marketing/social', 'Revivr Marketing/16 Social Queue/'],
    ['campaigns', 'Campaigns', 'Coordinated pushes tied to launches and milestones.', '/marketing/apps', 'Revivr Marketing/03 Campaigns/'],
    ['audience-research', 'Audience Research', 'Who the accessibility audience is and what reaches them.', '/marketing/report', 'Revivr Marketing/'],
    ['marketing-assets', 'Marketing Assets', 'Reusable creative — media, voice/golden set, templates.', '/marketing/social', 'Revivr Marketing/07 Assets/'],
    ['launch-planning', 'Launch Planning', 'Sequencing a release across store, social, and web.', '/marketing/approvals', 'Revivr Marketing/12 Approvals/'],
    ['marketing-performance', 'Marketing Performance', 'Reviews, reach, and what actually moved the needle.', '/marketing/report', 'Revivr Marketing/06 Metrics/'],
  ].map(([id, label, description, opsSection, vaultPath]) => ({
    id, label, tier: 'domain', owner: 'quell', group: 'marketing',
    description, responsibilities: [], status: null, platform: null,
    opsOwner: null, marketingOwner: 'quell', nextMilestone: null,
    vaultPath, opsSection, visibleInitially: false,
  })),

  // ---- Projects (tier: project) — revealed when Projects is clicked -------
  // LIVE-DATA: status / platform / nextMilestone below are hand-authored
  // placeholders. Replace by fetching GET /api/projects (the project-registry
  // reader) and merging onto matching node ids by appName. Match on `label`.
  ...[
    ['stare-and-share', 'Stare & Share', 'live', 'visionOS', 'Post-launch iteration'],
    ['track-stash', 'Track Stash', 'live', 'iOS', 'Reviews + retention pass'],
    ['spatial-tree', 'Spatial Tree', 'development', 'visionOS', 'Feature-complete build'],
    ['meditation-app', 'Meditation App', 'concept', 'visionOS', 'Prototype the core loop'],
    ['audio-visualizer', 'Audio Visualizer', 'development', 'visionOS', 'Rendering pass'],
    ['view-master-app', 'View Master–inspired App', 'concept', 'visionOS', 'Interaction spike'],
    ['webxr-accessibility', 'WebXR Accessibility Environments', 'research', 'WebXR', 'Reference environment'],
    ['vision-pro-experiments', 'Vision Pro Experiments', 'research', 'visionOS', 'Interaction R&D'],
  ].map(([id, label, status, platform, nextMilestone]) => ({
    id, label, tier: 'project', owner: 'shared', group: 'projects',
    description: `${label} — executed by Quinn, positioned by Quell.`,
    responsibilities: [],
    status,        // LIVE-DATA: from /api/projects
    platform,      // LIVE-DATA: from /api/projects
    opsOwner: 'quinn', marketingOwner: 'quell',
    nextMilestone, // LIVE-DATA: from /api/projects
    vaultPath: 'VisionAppDev/RAD/',   // LIVE-DATA: could become a live existence check via the vault-read helper
    opsSection: '/rad',               // LIVE-DATA: real dashboard route — could deep-link per slug
    visibleInitially: false,
  })),

  // ---- Accessibility Mission subtopics (tier: accessibility) --------------
  // Revealed when Accessibility Mission is clicked.
  ...[
    ['mobility-limitations', 'Mobility Limitations', 'Designing for people with limited or no hand/limb mobility.'],
    ['als', 'ALS', 'Progressive-condition users for whom hands-free access is essential.'],
    ['eye-based-interaction', 'Eye-based Interaction', 'Gaze as a primary, reliable input.'],
    ['hands-free-interaction', 'Hands-free Interaction', 'Complete flows without touch or controllers.'],
    ['caregiver-support', 'Caregiver Support', 'Making setup and assistance simple for helpers.'],
    ['vision-pro-accessibility', 'Vision Pro Accessibility', 'Pushing what the platform’s accessibility affords.'],
    ['webxr-accessibility-mission', 'WebXR Accessibility', 'Access without a headset purchase — the browser as the floor.'],
    ['independent-access', 'Independent Access', 'The outcome that matters: doing it yourself.'],
  ].map(([id, label, description]) => ({
    id, label, tier: 'accessibility', owner: null, group: 'accessibility',
    description, responsibilities: [], status: null, platform: null,
    opsOwner: null, marketingOwner: null, nextMilestone: null,
    vaultPath: null, opsSection: null, visibleInitially: false,
  })),

  // ---- External tools (tier: external) -----------------------------------
  // Revealed by clicking a node they integrate with (see EDGES). Keep
  // integrations meaningful — do not wire every tool to every agent.
  ...[
    ['github', 'GitHub'],
    ['app-store-connect', 'App Store Connect'],
    ['revenuecat', 'RevenueCat'],
    ['apple-developer', 'Apple Developer'],
    ['analytics', 'Analytics'],
    ['social-platforms', 'Social Platforms'],
    ['claude', 'Claude'],
    ['codex', 'Codex'],
    ['gemini', 'Gemini'],
    ['fable', 'Fable'],
    ['three-js', 'Three.js'],
    ['realitykit', 'RealityKit'],
    ['unreal-engine', 'Unreal Engine'],
  ].map(([id, label]) => ({
    id, label, tier: 'external', owner: null, group: 'external',
    description: `${label} — external tool/service the studio integrates with.`,
    responsibilities: [], status: null, platform: null,
    opsOwner: null, marketingOwner: null, nextMilestone: null,
    vaultPath: null, opsSection: null, visibleInitially: false,
  })),
];

export const EDGES = [
  // Org / ownership spine
  { from: 'revivr-studios', to: 'quinn', type: 'delegates' },
  { from: 'revivr-studios', to: 'quell', type: 'delegates' },
  { from: 'revivr-studios', to: 'accessibility', type: 'driven-by' },
  { from: 'quinn', to: 'operations', type: 'owns' },
  { from: 'quell', to: 'marketing', type: 'owns' },

  // Vault + website relationships
  { from: 'quinn', to: 'obsidian-vault', type: 'reads-writes' },
  { from: 'quell', to: 'obsidian-vault', type: 'reads-writes' }, // Revivr Marketing sub-vault
  { from: 'obsidian-vault', to: 'operations-website', type: 'summarized-into' },
  { from: 'quinn', to: 'operations-website', type: 'owns' },

  // Quinn → operational responsibilities (revealed via quinn OR operations)
  ...['project-tracking', 'tasks-priorities', 'milestones', 'dev-status', 'risks-blockers', 'release-planning', 'documentation']
    .flatMap((id) => [{ from: 'quinn', to: id, type: 'owns' }, { from: 'operations', to: id, type: 'contains' }]),

  // Quell → marketing responsibilities (revealed via quell OR marketing)
  ...['product-positioning', 'app-store-marketing', 'website-messaging', 'social-media', 'campaigns', 'audience-research', 'marketing-assets', 'launch-planning', 'marketing-performance']
    .flatMap((id) => [{ from: 'quell', to: id, type: 'owns' }, { from: 'marketing', to: id, type: 'contains' }]),

  // Projects hub → each project, plus shared quinn/quell ownership per project.
  // Both quinn & quell touching a project is what the renderer blends — no
  // separate 'shared' edge type.
  ...['stare-and-share', 'track-stash', 'spatial-tree', 'meditation-app', 'audio-visualizer', 'view-master-app', 'webxr-accessibility', 'vision-pro-experiments']
    .flatMap((id) => [
      { from: 'projects', to: id, type: 'contains' },
      { from: 'quinn', to: id, type: 'owns-execution' },
      { from: 'quell', to: id, type: 'owns-positioning' },
    ]),

  // Accessibility mission → facets, and projects that most embody it
  ...['mobility-limitations', 'als', 'eye-based-interaction', 'hands-free-interaction', 'caregiver-support', 'vision-pro-accessibility', 'webxr-accessibility-mission', 'independent-access']
    .map((id) => ({ from: 'accessibility', to: id, type: 'contains' })),
  { from: 'accessibility', to: 'projects', type: 'drives' },

  // External integrations — meaningful only (revealed by clicking the partner)
  { from: 'github', to: 'quinn', type: 'integrates' },
  { from: 'github', to: 'projects', type: 'integrates' },
  { from: 'app-store-connect', to: 'quinn', type: 'integrates' },
  { from: 'app-store-connect', to: 'quell', type: 'integrates' },
  { from: 'revenuecat', to: 'operations', type: 'feeds-metrics' },
  { from: 'apple-developer', to: 'quinn', type: 'integrates' },
  { from: 'analytics', to: 'operations', type: 'feeds-metrics' },
  { from: 'analytics', to: 'marketing-performance', type: 'feeds-metrics' },
  { from: 'social-platforms', to: 'quell', type: 'integrates' },
  { from: 'social-platforms', to: 'social-media', type: 'integrates' },
  { from: 'claude', to: 'quinn', type: 'powers' },
  { from: 'codex', to: 'quinn', type: 'powers' },
  { from: 'gemini', to: 'quell', type: 'powers' },
  { from: 'fable', to: 'quell', type: 'powers' },
  { from: 'three-js', to: 'operations-website', type: 'integrates' },
  { from: 'realitykit', to: 'projects', type: 'integrates' },
  { from: 'unreal-engine', to: 'projects', type: 'integrates' },
];

// LIVE-DATA: Quinn/Quell owner attribution and the responsibilities lists are
// hand-authored. If the Problems/RAD boards start tagging tickets by agent,
// a live counts-per-domain overlay would hook in here (merge counts onto the
// tier:'domain' nodes by id, render as a small badge in nodes.js).
