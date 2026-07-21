# /architecture business-map — verification (2026-07-14)

Playwright (headless Chromium + SwiftShader WebGL) against the deployed dashboard.

- `01-initial-9-nodes.png` — initial view: exactly the 9 core nodes
  (Revivr Studios, Quinn, Quell, Operations, Marketing, Projects, Accessibility
  Mission, Obsidian Vault, Operations Website).
- `02-projects-revealed.png` — after toggling the Projects filter (9 → 17 visible).
- `03-quinn-selected.png` — Quinn selected: children revealed, camera framed,
  side panel with real data + clickable connected nodes.

Checks that passed: build (no SSR/window errors), 9 initial nodes, hover
emphasis, click-reveal, filter reveal/dim, side panel real data for Quinn /
a project (Stare & Share: live · visionOS) / externals, Dream Team pipeline
still reachable, and **no console errors**.

## DreamTeamOverview — interactive rebuild (2026-07-14)
- `10-dreamteam-both-planes.png` — Build Memory (VisionAppDev) + Operations
  Memory (OpenClaw: Quinn's memory, Revivr Marketing, Operations Website).
- `11-dreamteam-quinn-access.png` — Quinn selected: READ across all build
  layers, WRITE on OpenClaw Memory + Operations Website, Marketing dimmed.
- `12-dreamteam-layer3-expanded.png` — Layer 3 expanded: per-agent access
  (Builders BLOCKED, Gatekeeper WRITE, Quinn READ).
Verified: two planes render, agent-click highlights access, layer-click
expands, no console errors.
