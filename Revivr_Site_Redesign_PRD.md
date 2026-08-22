# Revivr Studios Website — PRD: Site Redesign v2

**Status:** Ready to build
**Date:** August 22, 2026
**Owner:** Einar Johnson, Revivr Studios (support@revivrstudios.com)
**Repo:** `/Volumes/Sureal Drive/Revivr Site ` ← **NOTE: the directory name ends with a trailing space. Quote every path.**
**Live site:** https://revivrstudios.com (Firebase Hosting, project `revivr-studios`)
**Companion asset:** working WebXR prototype at `/Volumes/Sureal Drive/AppleDeveloper/Xcode_Projects/openspace-exposure-prototype/` (see §7)

---

## 0. How to work — read before touching anything

- **Branch off `main`:** `feature/site-redesign-v2`. Commit in logical chunks.
- **DO NOT deploy to production.** The owner wants to test first. After building, deploy a **preview channel only**:
  ```
  npm run build
  firebase hosting:channel:deploy redesign --expires 30d
  ```
  Report the generated preview URL (`https://revivr-studios--redesign-*.web.app`) back to the owner. Never run plain `firebase deploy`. The Firebase CLI is already authenticated on this machine.
- **Stack:** vanilla HTML/CSS/JS + Vite 5 multipage. Root-level `*.html` files are auto-discovered as entry points by `vite.config.js` (a new `robotics.html` needs no config change). `public/` is copied verbatim into `dist/`.
- **Verify against the Firebase emulator, not `vite preview`.** `vite preview` serves an SPA fallback that returns index.html with HTTP 200 for any path, masking 404s, and it ignores `firebase.json` redirects. Use `firebase emulators:start --only hosting` (serves `dist/` on port 5000/5002).
- **Known production gotcha:** parameterized redirect sources like `/:lang(es|fr|ja)/page.html` in `firebase.json` work in the emulator but are **silently ignored in production**. Use explicit per-path redirect rules only.
- `npm run dev` for local iteration.

---

## 1. Why this redesign exists

Revivr Studios' actual thesis: **empowering people with mobility issues through three technologies — XR (mainly Vision Pro), simple robotics controlled by XR, and WebXR.** The current site never states this. It reads as a general indie app studio: the homepage hero says "Empowering Mobility through XR" and then presents an undifferentiated feed mixing assistive tools with home décor, a musician's utility, and a perimenopause tracker. The aesthetic (pure black + saturated orange + four different neon accents in the WebXR section) reads gaming, not med-tech.

A full analysis (strategy, aesthetics, verified code defects) was completed on 2026-08-22. This PRD operationalizes it plus the owner's direct feedback:

1. **No teal.** Hard guardrail — see §3.
2. The homepage needs a **graphic showing the three pillars** and how each supports people with mobility issues (spec + starter SVG in Appendix A).
3. The non-assistive apps are to be framed as what they really are: **the studio's Vision Pro learning ground and accessibility testbed** (copy in Appendix C.2).
4. The WebXR section must lead with **1–2 mission-relevant demos** replacing the neon/audio experiments as the face of the section (§7).

---

## 2. Scope

**P0 (this build):**
- New design system (tokens + components), §4
- Redesigned pages: `index.html`, `about.html` (new; merges mission+founder), `services.html`, `webxr.html`, `robotics.html` (new), §5
- Defect fixes, §6
- Open Space demo integrated and linked, §7.1
- Redirects for retired URLs, §5.3
- Preview-channel deploy + verification checklist, §8

**P1 (only if P0 is complete and verified):**
- Build the "Look & Say" demo, §7.2
- Apply the new nav/shell to the app detail pages (plantelier.html, quietspace.html, etc.)
- WebP conversion pass on remaining heavy images

**Out of scope — do not touch:**
- `es/`, `fr/`, `ja/` locale directories (they keep the old design until a translation pass; their URLs must keep working)
- App detail pages in P0 (content and URLs unchanged)
- All `privacy-*.html` pages
- `dist/` (generated), `.firebase/` cache, `backup/`, `*.py` scripts, `product_pivot_plan.md.rtf`
- App Store links and claims on app pages (they were just verified/corrected in the Plantelier rebrand — do not reintroduce stale claims)

---

## 3. Hard guardrails

1. **No teal. No cyan. No green-cyan hues anywhere in the new CSS.** Owner explicitly rejected teal. Acceptance includes a grep for it (§8).
2. **One accent color.** The matured amber (§4). The steel-blue is a quiet secondary for informational elements only — never for CTAs, never as a second "brand" color. The four-neon treatment in the current WebXR section must not survive.
3. **No invented trust signals.** No fabricated testimonials, client names, partner logos, clinical claims, or robot product photos. Where a section calls for evidence that doesn't exist yet, use honest "in development" framing.
4. **No stale feature claims.** Verify any app claim against the app's actual page before repeating it.
5. **Accessibility is a product requirement, not a nav button.** The existing high-contrast toggle (`#accessibility-toggle` in `src/js/main.js`, `body.accessibility-mode`) must keep working on every redesigned page. Visible keyboard focus states on all interactive elements. Respect `prefers-reduced-motion` for any animation. All images get meaningful `alt`.
6. **Med-tech hygiene:** the Open Space demo card carries the disclaimer in §7.1.

---

## 4. Design system

Create `src/css/tokens.css` and `src/css/components.css`. Redesigned pages load these and carry **zero inline `style=""` attributes** (acceptance-checked). Leave the old `style.css`/`layout.css` in place for non-redesigned pages; redesigned pages should not depend on them.

### 4.1 Color tokens (dark-first, single theme)

```css
:root {
  --ground:  #0F141D;   /* blue-biased near-black — replaces pure #000 */
  --surface: #161D29;   /* cards */
  --line:    rgba(232, 235, 239, 0.08);
  --ink:     #E8EBEF;   /* primary text */
  --muted:   #95A0AE;   /* secondary text — this replaces the undefined --text-secondary */
  --accent:  #E09A4A;   /* THE accent: the brand orange #FF8C42, matured */
  --accent-strong: #EDB06A;  /* hover/active */
  --steel:   #8AA5CC;   /* quiet secondary: inline links in body text, info chips */
}
body.accessibility-mode {
  --ground: #000000; --surface: #000000; --ink: #FFFFFF;
  --muted: #FFFFFF; --accent: #FFD60A; --accent-strong: #FFD60A; --steel: #FFD60A;
  /* preserve the intent of the existing high-contrast mode; test it on every page */
}
```

Rationale: continuity — this is the site's own orange desaturated, not a new brand color. Amber (warm) on blue-black (cool) reads warm-clinical.

### 4.2 Typography

- **Display:** `Archivo` (weights 600/700/800) from Google Fonts, for h1–h3, nav, buttons, chips. `letter-spacing: -0.01em` on large sizes.
- **Body:** system stack `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (perf; no second webfont).
- **Scale (tokens, use everywhere, no ad-hoc px):** 13 / 15 / 17 (body) / 21 / 27 / 34 / hero `clamp(38px, 6vw, 56px)`. Line-height 1.6 body, 1.15 headings. Running text max-width ~68ch.

### 4.3 Components (minimum set)

`.site-nav` (current nav markup restyled; keep hamburger + backdrop + close-button JS contract: same IDs), `.section` (consistent vertical rhythm), `.card` (surface + line border + 16px radius), `.btn` (amber fill, dark text) / `.btn-ghost` (line border), `.chip` + `.chip--shipping|--live|--dev` (status labels used by the pillar graphic and WebXR cards), `.app-tile` (compact studio-grid item), `.footer`. Spacing scale: 4/8/12/16/24/32/48/64/96px tokens.

---

## 5. Page specs

All redesigned pages share: the restyled nav (same links as current + `robotics`), the footer (© year via existing `current-year` script, Privacy Policy → `/privacy.html`, Contact → `mailto:support@revivrstudios.com`), the head template from §6.4, and the language dropdown **removed on redesigned pages** (locale mirrors still show the old design; re-add the dropdown after the localization pass — but do not delete the locale files themselves).

### 5.1 `index.html` — full rebuild

Section order (copy verbatim from Appendix C.1 unless noted):

1. **Hero.** H1 + support line + proof line + two CTAs: `.btn` "Book a discovery call" (mailto per §6.6) and `.btn-ghost` "See the work" (→ `#assistive`).
2. **Three-pillar graphic.** The centerpiece. Person at center, three pillar nodes with honest status chips, one-line support caption per pillar. Starter SVG in Appendix A — adapt to tokens, keep it responsive (`viewBox`, no fixed sizes), each node wrapped in a link (Spatial Computing → `#assistive`, WebXR → `/webxr.html`, Robotics → `/robotics.html`). Static is fine; optional line-draw on scroll gated behind `prefers-reduced-motion: no-preference`.
3. **Assistive Technology** (`id="assistive"`). Three cards, this order:
   - **Stare&Share** (flagship, largest card): reuse tagline + description from current index feed; status chip "In development"; link `/stareandshare.html`; thumbnails `stareandshare-main.png` + `stareandshare-companion.avif`.
   - **Quiet Space**: reframed one-liner — "A sensory-regulation space: one calm object to rest your attention on, in your own room." Status "Coming Soon"; link `/quietspace.html`.
   - **WebXR Therapeutics**: card for the WebXR program → `/webxr.html`, one-liner "Care that travels as a link — no headset, no install required."
4. **From the Studio.** Intro paragraph = Appendix C.2 verbatim. Then a **compact** `.app-tile` grid (not the current full feed): Plantelier, VisionMarkUp, Track Stash, Spatial Reel, TeleVisionPrompter, PeriPal — each tile: name, one-line tagline (reuse existing), one thumbnail, App Store badge if live / status chip if not, link to its page. Existing thumbnails in `src/assets/` (`plantelier-12.jpg`, `visionmark-thumbnail-1.jpg`, `trackstash-splash-dark.png`, `reelmaster-1.jpg`, `televisionprompter-2.png`, `peripal-charts.jpg`).
5. **Founder teaser.** Photo (`founder-photo.png`) + pull-quote: "I'm building this because ALS runs in my family. I've seen first-hand the need for quality-of-life improvements for people with mobility issues." + link "Read the story → `/about.html`".
6. **CTA band.** "Ready to build something meaningful?" + discovery-call `.btn`.

### 5.2 `robotics.html` — new page

Copy draft in Appendix C.3 (~250 words, honest in-development framing). Layout: page header → three short "why" blocks (reach / fetch / adjust) → approach paragraph → "Seeking pilot partners" CTA (mailto with subject `Robotics pilot inquiry`). **Imagery: none fabricated.** Either a simple abstract SVG (reuse the robotics node icon from Appendix A, enlarged) or no imagery. When the owner supplies bench photos later, they slot in.

### 5.3 `about.html` — new page (merges mission + founder)

- Mission block: Appendix C.4 (existing mission copy with the "experimental tester apps / AI-assisted development" paragraph **removed**, replaced by the testbed paragraph).
- Founder block: reuse the full founder story from `founder.html` **verbatim** (it's good), plus photo and the existing X/Twitter link.
- Delete `mission.html` and `founder.html` from the repo root and add explicit 301s in `firebase.json`: `/mission.html → /about.html`, `/founder.html → /about.html`. Do **not** touch the locale copies of mission/founder.
- Update nav on redesigned pages: replace the two links `mission` + `founder` with one `about`.

### 5.4 `services.html` — restyle + fix

- Keep the existing structure (capabilities → process → CTA) and copy.
- Rebuild with the component system (the three capability cards keep their background images at reduced opacity, consistent treatment).
- The final CTA becomes a real `.btn` (the current `.hero-cta` class does not exist in any stylesheet — the site's main conversion button renders as a bare text link today).
- Add the same CTA at the top of the page under the header.
- Add an "Engagement snapshots" section: 2–3 honest mini case studies drawn from real work, format *Challenge → Approach → Status*. Use Stare&Share (gaze-only interaction for caregiver communication) and the WebXR therapeutic work (browser-delivered exposure therapy prototype). No invented clients.

### 5.5 `webxr.html` — restructure

1. Page header (keep existing title/sub).
2. **Promote the existing access/ALS body copy** (currently below the tiles) to directly under the header — it's the best copy on the page.
3. **Featured demos** (large cards, uniform styling, single accent):
   - **Open Space** — graduated exposure therapy. Links to `/openspace/` (§7.1). Copy in Appendix C.5. Status chip "Live demo".
   - **Look & Say** — gaze communication board. If P1 is built, link it; otherwise render the card with status chip "In development" and **no dead link**.
4. **Experiments** row: the four existing pieces (Neon Geometry, Neural Nexus, Synapse, Neon Audio Visualizer) as small uniform tiles — same accent, no per-tile neon colors, framed with one shared intro line: "Rendering and interaction experiments from the lab." Keep their pages and URLs as-is.

---

## 6. Defect fixes (all P0 — several are live bugs today)

1. **Undefined CSS variables.** `--accent-primary` (7 uses — every "Coming Soon" button on the homepage renders with no background), `--text-secondary` (19 uses — all "muted" text renders full white), `--text-primary`, `--border-color`. On redesigned pages these disappear with the rebuild; for **non-redesigned pages** (app details), add definitions to `src/css/style.css` `:root` mapping to the new tokens' values so those pages heal without a rebuild: `--accent-primary: #E09A4A; --text-secondary: #95A0AE; --text-primary: #E8EBEF; --border-color: rgba(232,235,239,0.15);`
2. **`.hero-cta`** — see §5.4.
3. **Open Graph / Twitter meta** on every redesigned page (template in §6.4).
4. **`public/sitemap.xml` + `public/robots.txt`.** Sitemap lists all root pages (redesigned + app pages + privacy pages) and locale pages. Robots allows all, points at the sitemap.
5. **Image performance.** `loading="lazy"` on every image below the fold on redesigned pages; `decoding="async"`; explicit `width`/`height` where known. Convert homepage-referenced images >300 KB to WebP (keep originals; `cwebp` or Python Pillow — repo already contains Pillow-based scripts as precedent). Target: homepage total transfer < 2.5 MB.
6. **Email unification.** `support@revivrstudios.com` everywhere (footer already uses it; the Services CTA currently uses `contact@` — change it). Flag in the handoff notes that the owner should alias `contact@` → `support@` at the mail provider.
7. **OG image.** Generate `public/og-card.png` (1200×630): the Revivr logo (`src/assets/revivr-logo-hires.png`) centered on `#0F141D`. A small Python/Pillow script is fine; commit the output.

### 6.4 Head template (all redesigned pages)

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/png" href="/favicon.png" />
<title>{Page} | Revivr Studios</title>
<meta name="description" content="{page description}" />
<meta property="og:site_name" content="Revivr Studios" />
<meta property="og:title" content="{Page} | Revivr Studios" />
<meta property="og:description" content="{page description}" />
<meta property="og:image" content="https://revivrstudios.com/og-card.png" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://revivrstudios.com/{page}.html" />
<meta name="twitter:card" content="summary_large_image" />
```

---

## 7. WebXR demos

### 7.1 Open Space (P0 — integrate the existing prototype)

Source: `/Volumes/Sureal Drive/AppleDeveloper/Xcode_Projects/openspace-exposure-prototype/` — a self-contained Three.js WebXR app (`index.html` + `assets/` with FBX trees/rock + textures). It is a working graduated-exposure-therapy prototype: six levels (Safe Room → Full Expanse), gaze-dwell progression, self-paced distress check-ins, procedural wind audio. Recent fixes already applied in-place: leaf-material regex, async asset race, reticle contrast, `dom-overlay` session feature.

Integration steps:
1. Copy the prototype into `public/openspace/` (so Vite ships it verbatim — it uses a CDN import map; do not let Vite bundle it). Entry becomes `/openspace/` → `/openspace/index.html`.
2. **Self-host the HDRI** (biggest visual win, the sky currently falls back to a flat gradient because Poly Haven's CDN lacks CORS headers): download `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr` (CC0) into `public/openspace/assets/`, and change the `HDRI_URL` const in its `index.html` to `'./assets/kloofendal_48d_partly_cloudy_puresky_1k.hdr'`.
3. Verify in the Firebase emulator: page loads, no console errors besides expected ones, trees render (there is a procedural fallback — the real FBX trees should load, watch for the `natureAssets` fallback warning).
4. The WebXR page card for it must include: *"A research prototype demonstrating graduated exposure design — not a medical device. Explore with a clinician's guidance if open spaces are difficult for you."*

### 7.2 Look & Say (P1 — build only after P0 verified)

A self-contained gaze/dwell communication board at `public/lookandsay/index.html`. v1 spec:

- **Boards:** three switchable tile sets — Needs ("Water", "Reposition me", "Too warm", "Too cold", "Pain", "Bathroom"), Feelings ("I'm okay", "Tired", "Anxious", "Happy", "Frustrated"), Phrases ("Yes", "No", "Thank you", "Please wait", "Come here", "I love you").
- **Interaction:** dwell-to-activate. Pointer hover (or touch-and-hold) starts a visible ring filling around the tile; default 1.2 s dwell, adjustable 0.8–3.0 s in settings. On activation the tile speaks via `speechSynthesis` and flashes confirmation. No click required, ever.
- **Settings pane** (itself dwell-operable): dwell time, text size (3 steps), high-contrast toggle.
- **Visual treatment:** DOM + CSS, not 3D — calm radial-gradient dark room in the site palette, large Archivo type, amber dwell ring. This demo is typography and interaction; that is why its visuals are cheap to get right.
- **Accessibility:** real `<button>` elements, ARIA labels, works with keyboard focus + Enter as a parallel path, screen-reader friendly.
- **Scope fence:** no networking, no accounts, no caregiver pairing in v1 — the card copy points to Stare&Share (native app) as "the full version of this idea." An immersive WebXR mode is a later phase; do not block on it.

---

## 8. Acceptance checklist (run every item before handing off)

- [ ] `npm run build` completes clean; all new pages present in `dist/`
- [ ] Verified via `firebase emulators:start --only hosting` (NOT `vite preview`): every redesigned page 200; `/mission.html` and `/founder.html` → 301 → `/about.html`; all pre-existing redirects in `firebase.json` still work (`/spatialtree.html` → `/plantelier.html` etc.); locale pages (`/es/index.html` etc.) still 200 with old design
- [ ] `/openspace/` loads in the emulator with the self-hosted sky (no flat-gradient fallback, no CORS errors in console)
- [ ] `grep -ri "teal" src/css/` → nothing; no cyan/teal hexes in new CSS; the four neon accents appear nowhere outside the four experiment pages themselves
- [ ] `grep -c 'style="' ` on each redesigned page → 0
- [ ] Undefined-variable fix verified: app detail pages (e.g. `/plantelier.html`) show colored "Coming Soon"/muted text via the new `:root` definitions
- [ ] Accessibility toggle works on every redesigned page; hamburger menu works at mobile width; visible keyboard focus on nav, buttons, tiles
- [ ] OG tags on every redesigned page; `https://.../og-card.png` resolves; `sitemap.xml` + `robots.txt` served
- [ ] Homepage transfer < 2.5 MB; below-fold images lazy
- [ ] All copy matches Appendix C — no stale claims, no invented clients/testimonials, disclaimer present on the Open Space card
- [ ] Deployed to a **preview channel** (30-day expiry), NOT production; preview URL reported to owner with a summary of what changed and what remains (P1 items)

---

## Appendix A — Three-pillar graphic (starter SVG)

Adapt to CSS tokens (classes, not hardcoded fills). Node icons: XR goggles, globe, robotic arm; person at center. Keep `role="img"` + `aria-label`. Each node becomes a link. Status text: Spatial Computing "SHIPPING · 4 apps live" (verify count against the App Store badges on the homepage at build time), WebXR "LIVE · no install needed", Robotics "IN DEVELOPMENT".

```svg
<svg viewBox="0 0 680 430" role="img" aria-label="A person at the center, supported by three pillars: Spatial Computing, WebXR, and Assistive Robotics">
  <line class="link" x1="340" y1="118" x2="340" y2="180"/>
  <line class="link" x1="163" y1="295" x2="290" y2="245"/>
  <line class="link" x1="517" y1="295" x2="390" y2="245"/>
  <circle class="person-fill" cx="340" cy="228" r="52"/>
  <g class="icon icon-accent" transform="translate(340 228)">
    <circle cx="0" cy="-16" r="9"/><path d="M -12 22 C -12 4 12 4 12 22"/>
  </g>
  <text class="nodelabel" x="340" y="308">The person</text>
  <text class="nodestate" x="340" y="326">independence · connection · reach</text>
  <circle class="node-fill" cx="340" cy="72" r="44"/>
  <g class="icon" transform="translate(340 72)">
    <path d="M -20 -7 h 40 a 6 6 0 0 1 6 6 v 8 a 6 6 0 0 1 -6 6 h -10 l -5 -6 h -10 l -5 6 h -10 a 6 6 0 0 1 -6 -6 v -8 a 6 6 0 0 1 6 -6 z"/>
  </g>
  <text class="nodelabel" x="340" y="24">Spatial Computing</text>
  <text class="nodestate" x="340" y="40">SHIPPING · 4 apps live</text>
  <circle class="node-fill" cx="130" cy="330" r="44"/>
  <g class="icon" transform="translate(130 330)">
    <circle cx="0" cy="0" r="19"/><ellipse cx="0" cy="0" rx="8.5" ry="19"/><line x1="-19" y1="0" x2="19" y2="0"/>
  </g>
  <text class="nodelabel" x="130" y="399">WebXR</text>
  <text class="nodestate" x="130" y="415">LIVE · no install needed</text>
  <circle class="node-fill" cx="550" cy="330" r="44"/>
  <g class="icon" transform="translate(550 330)">
    <path d="M -16 20 h 14"/><path d="M -9 20 v -14 l 13 -9"/>
    <circle cx="-9" cy="6" r="3.2"/><circle cx="4" cy="-3" r="3.2"/>
    <path d="M 4 -3 l 12 -8"/><path d="M 16 -11 l 5 -5 m -5 5 l 6 4"/>
  </g>
  <text class="nodelabel" x="550" y="399">Assistive Robotics</text>
  <text class="nodestate" x="550" y="415">IN DEVELOPMENT</text>
</svg>
```

Caption legend (three columns under the graphic):
- **Spatial Computing — see & do more from where you are.** Gaze-and-pinch control means full interaction without fine motor dexterity. Communication, sensory regulation, expanded worlds — from a chair or a bed.
- **WebXR — care that travels as a link.** No headset? No install? Still works. Therapeutic experiences reach a bedside tablet, a clinic's Quest, or a phone.
- **Assistive Robotics — reach beyond arm's length.** The headset becomes a remote body: look, pinch, and a simple robot fetches, moves, adjusts.

## Appendix B — Palette quick sheet

| Token | Hex | Use |
|---|---|---|
| ground | `#0F141D` | page background |
| surface | `#161D29` | cards |
| ink | `#E8EBEF` | primary text |
| muted | `#95A0AE` | secondary text |
| accent | `#E09A4A` | CTAs, dwell rings, links on surfaces, chips |
| accent-strong | `#EDB06A` | hover |
| steel | `#8AA5CC` | inline body links, informational chips |

Forbidden: teal/cyan family; `#FF0055`, `#00FF88`, `#00D2FF`, `#9600FF` outside the four experiment pages.

## Appendix C — Copy blocks (use verbatim)

**C.1 Hero.**
H1: "Empowering mobility through spatial computing."
Support: "Vision Pro apps, browser-based WebXR, and XR-controlled assistive robotics for people whose physical world has gotten smaller."
Proof line: "Founded by an XR engineer with ALS in the family. Four apps shipped on the App Store — and counting."

**C.2 From the Studio intro.**
"Each of these apps taught us how to build for Vision Pro — and each doubles as a proving ground for Apple's spatial-computing accessibility stack. Dwell control, VoiceOver in 3D space, alternative pointer input, reduced-motion modes: we implement and stress-test them in shipping products first, so by the time a pattern reaches our assistive work, it's already survived real users."

**C.3 Robotics page.**
H1: "Assistive Robotics" · Eyebrow/status: "In development"
"The third pillar of our work: simple, affordable robots controlled through the same gaze-and-pinch interactions that make Vision Pro accessible in the first place.

For someone with limited mobility, the hardest problems are often physical and small: the cup just out of reach, the light switch across the room, the door that needs opening. Spatial computing gives us a natural control surface — look at a thing, pinch, and let a simple machine do the reaching.

We are early. Our first bench prototypes pair Vision Pro hand- and eye-tracking with off-the-shelf robotics, focused on three verbs: reach, fetch, adjust. No humanoids, no hype — small machines doing small, meaningful things reliably.

We're looking for collaborators: clinicians, occupational therapists, researchers, and families who want to shape what gets built first. If that's you, we'd genuinely like to talk."
CTA: "Start a conversation" → `mailto:support@revivrstudios.com?subject=Robotics%20pilot%20inquiry`

**C.4 About/mission rewrite.** Keep the three existing mission paragraphs from `mission.html` ("REVIVR empowers individuals…", "Our goal is to enhance…", "REVIVR is dedicated…"). **Delete** the "Beyond Accessibility" block ("experimental tester apps… AI-assisted development"). In its place, a block headed "Why we ship so much" containing the C.2 paragraph.

**C.5 Open Space demo card.**
"Open Space — graduated exposure for fear of open spaces. Six environments, from a safe enclosed room to a wide-open plain, advanced only when you say you're ready. Distress check-ins at every step. Runs in your browser — on Vision Pro, a desktop, or a tablet."
Plus disclaimer: "A research prototype demonstrating graduated exposure design — not a medical device. Explore with a clinician's guidance if open spaces are difficult for you."
