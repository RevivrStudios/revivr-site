# Home density + Assistant images — verification

Branch `home-density-assistant-images`. Verified against a production build
(`next start`) with Playwright driving a real browser.

## Results

- **`npm run build`** — succeeds.
- **Home desktop (1440px)** — Needs Decision renders full-width cards
  (count + label + one-line "why" + Resolve); Active Bets is a compact row;
  Renewals/Attention/Repo Hygiene present. No horizontal overflow.
  → `home-desktop.png`
- **Home mobile (390px)** — everything reflows to a single column, "Add bet"
  collapses to an icon, no horizontal overflow. → `home-mobile-375.png`
- **Detail panel** — Renewals opens the shared slide-over on desktop with the
  plain-language "what is this?" for AVPSetup provisioning
  (`renewal-panel-desktop.png`); Active Bets opens a bottom sheet on mobile,
  bottom-anchored at ~82vh with a drag grabber (`bet-sheet-mobile.png`).
  Dismiss via X, backdrop click, and Escape all confirmed. Panel is portalled
  to `<body>` so it overlays the sidebar as a true modal.
- **Attention "why it matters"** — 3 red tiles each show a plain-English line
  derived from the rule that fired (e.g. "No intake items have been
  processed/reconciled recently.").
- **Repo Hygiene legend** — the (?) by the title opens the dirty / orphan /
  since-last-commit glossary.
- **Assistant image support** — a screenshot attaches with a removable
  thumbnail preview (`assistant-image-preview.png`); on send, Claude's reply
  describes the actual image contents — the Dashboard header, the
  COMMAND/WORK/REFERENCE sidebar groups, "Last synchronized" — not just a
  successful network call (`assistant-image-reply.png`).
- **Console/page errors** — none across the whole run.
